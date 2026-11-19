<?php

namespace App\Http\Controllers\Modules\Report;

use App\Http\Controllers\Controller;
use App\Http\Requests\Archive\RecoverDocumentRequest;
use App\Http\Resources\Report\ArchivedDocumentResource;
use App\Mail\AbsentFormMail;
use App\Models\Absence;
use App\Models\Complaint;
use App\Models\GatePass;
use App\Models\Referral;
use App\Models\Report;
use App\Models\SchoolYear;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use ZipArchive;

class ArchiveController extends Controller
{
    /**
     * One entry per archivable document type. destroy(), transfer(), and
     * recoverDocument() all key off this instead of separate hand-written
     * if/else chains, so every type is treated the same way by
     * construction — adding a 6th type later means updating this table,
     * not three different methods.
     */
    private static array $archivable = [
        'complaint' => ['model' => Complaint::class],
        'referral' => ['model' => Referral::class],
        'absent form' => ['model' => Absence::class],
        'gate pass' => ['model' => GatePass::class],
    ];

    /**
     * Every archivable type (complaint/referral/absent form) has an
     * associated document folder to clean up on disk. Gate pass has no
     * uploaded files, so it has nothing to clean up (falls to default null).
     */
    public static function folderFor(string $type, $record): ?string
    {
        return match ($type) {
            'complaint' => storage_path("app/private/complaints/complaint-{$record->complaint_number}"),
            'referral' => storage_path("app/private/referrals/referral-{$record->referral_number}"),
            'absent form' => storage_path("app/private/absent-forms/absent-form-{$record->form_number}"),
            default => null,
        };
    }

    /**
     * Opens the record's PDF in the browser (a new tab), instead of
     * downloading the whole folder as a ZIP. Used by the archive and by the
     * complaint, referral and absent form pages; HasDocumentPdf::canViewPdf
     * says who may open it.
     */
    public function viewDocument($type, $id)
    {
        $id = decrypt_id($id) ?? abort(404);
        $record = match ($type) {
            'complaint' => Complaint::findOrFail($id),
            'referral' => Referral::findOrFail($id),
            'absent form' => Absence::findOrFail($id),
            default => abort(404, 'Invalid type.'),
        };

        abort_unless($record->canViewPdf(auth()->user()), 403);
        $path = $record->documentPdfPath();
        // The saved complaint PDF includes the Incident Summary, which only
        // the prefect may see: everyone else gets it built now, without it.
        if ($record instanceof Complaint && ! can_see_incident_summary()) {
            $path = null;
        }

        // Not final yet (pending, rejected, revoked...): built now, not saved.
        if (! $path) {
            $pdf = $record->renderDocumentPdf() ?? abort(404, 'This record has no PDF document.');
            $number = $record->complaint_number ?? $record->referral_number ?? $record->id;

            return $pdf->stream("{$type}-{$number}.pdf");
        }

        return response()->file($path, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.basename($path).'"',
        ]);
    }

    public function index()
    {
        return list_page('prefect/archive', [
            // The table: loaded by the page from /api/prefect/archive (every
            // row; it paginates in the browser).
            'document' => list_prop(fn () => self::getDocuments('all')),
            'school_years' => SchoolYear::orderByDesc('year')->pluck('year'),
        ]);
    }

    /**
     * Manually move one record into the archive, regardless of its
     * current status — the per-row "Archive" action on each list page.
     */
    public function transfer(Request $request)
    {
        $request->validate([
            'type' => 'required|in:complaint,referral,absent form,gate pass',
            'id' => 'required|integer',
        ]);

        $model = self::$archivable[$request->type]['model'];
        $doc = $model::find($request->id);

        if (! $doc) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        $doc->update(['archived_at' => archive_retention_date()]);

        return response()->json(['message' => ucfirst($request->type).' archived successfully.']);
    }

    /** The archivable types, with their models (PurgeExpiredArchiveCommand). */
    public static function archivableModels(): array
    {
        return array_map(fn ($t) => $t['model'], self::$archivable);
    }

    /**
     * Permanently removes an archived record and its saved files. Only the
     * daily PurgeExpiredArchiveCommand does this, once the record's
     * archived_at (its keep-until date) has passed.
     */
    public static function purge(string $type, $doc): void
    {
        $folder = self::folderFor($type, $doc);
        if ($folder && File::exists($folder)) {
            File::deleteDirectory($folder);
        }
        $doc->delete();
    }

    public function recoverDocument(RecoverDocumentRequest $request)
    {
        if ($request->type == 'complaint') {
            // Safely get the latest case number
            $lastCaseNumber = Complaint::whereNotNull('case_number')
                ->orderByDesc('case_number')
                ->value('case_number');

            // If no previous record, start at 1
            $nextCaseNumber = ($lastCaseNumber ?? 0) + 1;
            Complaint::where('id', $request->id)->update([
                'archived_at' => null,
                'rejected_reason' => null,
                'complaint_status' => 'ongoing',
                'case_number' => $nextCaseNumber,
            ]);
            $complaint = Complaint::with('user.profile')->where('id', $request->id)->first();

            notify_single_user(
                [
                    'sender_id' => auth()->user()->id,
                    'receiver_id' => $complaint->user->id,
                    'notif_type' => 'complaint',
                    'content' => json_encode([
                        'sender_id' => auth()->user()->id,
                        'receiver_id' => $complaint->user->id,
                        'message' => 'Your complaint has been recovered from archive and is now ongoing.',
                    ]),
                ]
            );

        }if ($request->type == 'referral') {
            // "Recover" means "put it back in an active, actionable
            // state" — mirrors exactly what complaint's recovery does,
            // just without a case-number-style field to reassign.
            Referral::where('id', $request->id)->update([
                'archived_at' => null,
                'rejected_reason' => null,
                'revoked_at' => null,
                'referral_status' => 'pending',
            ]);
        }if ($request->type == 'absent form') {
            Absence::where('id', $request->id)->update([
                'archived_at' => null,
            ]);
            $student = Absence::with(['user.profile', 'user.program'])->where('id', $request->id)->first();

            // generate pdf file with watermark as approved absent form
            // File path setup
            $folderPath = storage_path('app/private/absent-forms/absent-form-'.$student->form_number);
            $pdfPath = $folderPath.'/absent-form-approval-'.$student->user->id.'-'.$student->form_number.'.pdf';

            if (! is_dir($folderPath)) {
                File::makeDirectory($folderPath, 0755, true, true);
            }

            // --- Generate PDF (must succeed) ---
            $prefectName = auth()->user()->profile?->first_name.' '.auth()->user()->profile?->middle_name.' '.auth()->user()->profile?->last_name;
            $studentName = $student->user->profile?->first_name.' '.$student->user->profile?->middle_name.' '.$student->user->profile?->last_name;
            $pdfData = [
                'form_number' => $student->form_number,
                'sender_name' => $studentName,
                'prefect_name' => $prefectName,
                'date_from' => $student->date_from,
                'date_to' => $student->date_to,
                'reason' => implode(', ', json_decode($student->reason, true)),
                'date_approve' => now()->toFormattedDateString(),
                'status' => 'Approved',
                'note' => $student->note,
                'program' => $student->user->program?->code,
                'student_id' => $student->user->id_number,
            ];

            try {
                $pdf = Pdf::loadView('pdf.absent-form-approval', $pdfData);
                $pdf->save($pdfPath);
            } catch (\Exception $pdfErr) {
                throw new \Exception('PDF generation error: '.$pdfErr->getMessage());
            }

            // --- Email must succeed ---

            $emailData = [
                'form_number' => $student->form_number,
                'sender_name' => $prefectName,
                'student_name' => $studentName,
                'prefect_name' => $prefectName,
                'date_from' => $student->date_from,
                'date_to' => $student->date_to,
                'reason' => implode(', ', json_decode($student->reason, true)),
                'confirmed_at' => now()->toFormattedDateString(),
                'file' => 'absent-forms/absent-form-'.$student->form_number.'/absent-form-approval-'.$student->user->id.'-'.$student->form_number.'.pdf',
            ];

            try {
                Mail::to($student->user->email)
                    ->send(
                        (new AbsentFormMail($emailData))
                            ->attach($pdfPath, [
                                'as' => 'APPROVED-ABSENT-FORM.pdf',
                                'mime' => 'application/pdf',
                            ])
                    );
            } catch (\Exception $mailErr) {
                throw new \Exception('Email sending error: '.$mailErr->getMessage());
            }
        }

        // The whole list again (the page's table paginates in the browser).
        return self::getDocuments('all');
    }

    public function getDocuments($type = 'paginate')
    {
        $filterType = request()->input('type', 'all');
        $search = strtolower(request()->input('search', ''));
        $semester = request()->input('semester');

        $schoolYearRange = Report::resolveSchoolYearDates([
            'school_year' => request()->input('school_year'),
        ]);
        $dateFrom = $schoolYearRange['date_from'] ?? null;
        $dateTo = $schoolYearRange['date_to'] ?? null;

        // -----------------------
        // 1. COMPLAINT
        // -----------------------
        $complaint = Complaint::with([
            'user.profile',
            'user.program',
            'user.enrollments',
            'user.faculty.program', 'user.headships.program',
            'user.nonTeachingStaff',
            'subject.profile',
            'subject.program',
            'subject.enrollments',
            'subject.faculty.program', 'subject.headships.program',
            'complaintSubject.user.profile',
            'complaintSubject.user.program',
            'complaintSubject.user.enrollments',
            'complaintSubject.user.faculty.program', 'complaintSubject.user.headships.program',
        ])
            ->whereNotNull('archived_at')
            ->when($dateFrom && $dateTo, fn ($q) => $q->whereBetween('created_at', [$dateFrom, $dateTo]))
            ->get();

        $complaint->each(function ($item) {
            $item->usr = $item->user;
            unset($item->user);

            $item->student = $item->subject;
            $item->students = $item->complaintSubject;
            unset($item->subject);

            $item->type = 'complaint';
            $item->encrypted_id = encrypt_id($item->id);
        });

        // -----------------------
        // 2. REFERRAL
        // -----------------------
        $referral = Referral::with([
            'user.profile',
            'user.program',
            'user.enrollments',
            'user.faculty.program', 'user.headships.program',
            'user.nonTeachingStaff',
            'referredStudent.profile',
            'referredStudent.program',
            'referredStudent.enrollments',
            'referralReferredStudent.user.profile',
            'referralReferredStudent.user.program',
            'referralReferredStudent.user.enrollments',
        ])
            ->whereNotNull('archived_at')
            ->when($dateFrom && $dateTo, fn ($q) => $q->whereBetween('created_at', [$dateFrom, $dateTo]))
            ->get();

        $referral->each(function ($item) {
            $item->usr = $item->user;
            unset($item->user);

            $item->student = $item->referredStudent;
            $item->students = $item->referralReferredStudent;
            unset($item->referredStudent);

            $item->type = 'referral';
            $item->encrypted_id = encrypt_id($item->id);
        });

        // -----------------------
        // 3. ABSENT FORM
        // -----------------------
        $absent = Absence::with(['user.profile', 'user.program', 'user.enrollments'])
            ->whereNotNull('archived_at')
            ->when($dateFrom && $dateTo, fn ($q) => $q->whereBetween('created_at', [$dateFrom, $dateTo]))
            ->get();

        $absent->each(function ($item) {
            $item->student = $item->user;
            unset($item->user);

            $item->type = 'absent form';
            $item->encrypted_id = encrypt_id($item->id);
        });

        // -----------------------
        // 4. GATE PASS
        // -----------------------
        $gatePass = GatePass::with(['user.profile', 'user.program', 'user.enrollments'])
            ->whereNotNull('archived_at')
            ->when($dateFrom && $dateTo, fn ($q) => $q->whereBetween('created_at', [$dateFrom, $dateTo]))
            ->get();

        $gatePass->each(function ($item) {
            $item->student = $item->user;
            unset($item->user);

            $item->type = 'gate pass';
            $item->encrypted_id = encrypt_id($item->id);
        });

        // -----------------------
        // 5. MERGE
        // -----------------------
        $merged = $complaint
            ->concat($referral)
            ->concat($absent)
            ->concat($gatePass)
            ->sortByDesc('archived_at')
            ->values();

        // -----------------------
        // 5. FILTER BY TYPE
        // -----------------------
        if ($filterType !== 'all') {
            $merged = $merged->filter(function ($item) use ($filterType) {
                return strtolower($item->type) === strtolower($filterType);
            })->values();
        }

        // Status dropdown: the record's own status (see archiveStatus()).
        $status = request()->input('status');
        if (! empty($status) && $status !== 'all') {
            $merged = $merged->filter(fn ($item) => self::archiveStatus($item) === $status)->values();
        }

        // -----------------------
        // 6. FILTER BY SEMESTER
        // -----------------------
        if (! empty($semester)) {
            $merged = $merged->filter(function ($item) use ($semester) {
                return self::effectiveSemester($item) == $semester;
            })->values();
        }

        // -----------------------
        // 8. SEARCH FILTER
        // -----------------------
        if (! empty($search)) {

            $search = trim(strtolower($search));
            $parts = explode(' ', $search);

            $merged = $merged->filter(function ($item) use ($search, $parts) {

                /* 1️⃣ COMPLAINT */
                if ($item->type === 'complaint' && isset($item->students)) {
                    foreach ($item->students as $studItem) {
                        $user = $studItem->user ?? null;
                        if ($user && self::matchStudentSearch($user, $search, $parts)) {
                            return true;
                        }
                    }
                }

                /* 2️⃣ REFERRAL */
                if ($item->type === 'referral' && isset($item->students)) {
                    foreach ($item->students as $studItem) {
                        $user = $studItem->user ?? null;
                        if ($user && self::matchStudentSearch($user, $search, $parts)) {
                            return true;
                        }
                    }
                }

                /* 3️⃣ ABSENT FORM — a direct student record */
                if ($item->type === 'absent form' && isset($item->student)) {
                    $user = $item->student ?? null;
                    if ($user && self::matchStudentSearch($user, $search, $parts)) {
                        return true;
                    }
                }

                /* 4️⃣ GATE PASS — a direct student record */
                if ($item->type === 'gate pass' && isset($item->student)) {
                    $user = $item->student ?? null;
                    if ($user && self::matchStudentSearch($user, $search, $parts)) {
                        return true;
                    }
                }

                return false;
            })->values();
        }

        // downloadArchive(): the filtered records themselves.
        if ($type === 'records') {
            return $merged;
        }

        $paginated = $merged;
        if ($type == 'paginate') {
            // -----------------------
            // 9. PAGINATION
            // -----------------------
            $page = request()->input('page', 1);
            $perPage = request()->input('per_page', 10);
            $offset = ($page - 1) * $perPage;

            $paginated = new LengthAwarePaginator(
                $merged->slice($offset, $perPage)->values(),
                $merged->count(),
                $perPage,
                $page,
                [
                    'path' => request()->url(),
                    'query' => request()->query(),
                ]
            );
        }

        return ArchivedDocumentResource::collection($paginated);
    }

    /**
     * Mirrors archive-list.jsx's semesterValueFor() — whichever status a
     * record last transitioned into is the semester tag shown/filtered on,
     * falling back to the filing-time semester for still-pending rows.
     */
    private static function effectiveSemester($item): ?int
    {
        if ($item->revoked_at && ($s = $item->revokedSchoolYearSemester())) {
            return $s->semester;
        }
        if ($item->rejected_at && ($s = $item->rejectedSchoolYearSemester())) {
            return $s->semester;
        }
        if ($item->type === 'complaint' && $item->complaint_status === 'resolved' && ($s = $item->resolvedSchoolYearSemester())) {
            return $s->semester;
        }
        if ($item->confirmed_at && ($s = $item->confirmedSchoolYearSemester())) {
            return $s->semester;
        }

        return $item->schoolYearSemester()?->semester;
    }

    public function matchStudentSearch($user, $search, $parts)
    {
        $profile = $user->profile;
        $first = strtolower($profile->first_name ?? '');
        $middle = strtolower($profile->middle_name ?? '');
        $last = strtolower($profile->last_name ?? '');
        $userId = strtolower($user->id_number ?? '');

        $full1 = trim("$first $middle $last");
        $full2 = trim("$first $last");
        $full3 = trim("$last $first");

        // ---------- Single-word search ----------
        if (count($parts) === 1) {
            if (
                str_contains($first, $search) ||
                str_contains($middle, $search) ||
                str_contains($last, $search) ||
                str_contains($userId, $search)
            ) {
                return true;
            }
        }

        // ---------- Two-word search ----------
        if (count($parts) === 2) {
            [$p1, $p2] = $parts;

            if (
                str_contains($full2, "$p1 $p2") ||
                str_contains($full3, "$p1 $p2") ||
                (str_contains($first, $p1) && str_contains($last, $p2)) ||
                (str_contains($last, $p1) && str_contains($first, $p2))
            ) {
                return true;
            }
        }

        // ---------- Three or more ----------
        if (
            str_contains($full1, $search) ||
            str_contains($full2, $search) ||
            str_contains($full3, $search)
        ) {
            return true;
        }

        return false;
    }

    /** The archive tabs that have files, with the ZIP's folder for each. */
    private const ZIP_FOLDERS = [
        'complaint' => 'Complaints',
        'referral' => 'Referrals',
        'absent form' => 'Absent Forms',
    ];

    /**
     * An archived record's status, as the Archives table shows it
     * (archive-list.jsx statusValueFor): complaints and referrals have a
     * status column; absent forms and gate passes follow from which
     * decision date is set.
     */
    private static function archiveStatus($item): string
    {
        return match ($item->type) {
            'complaint' => (string) $item->complaint_status,
            'referral' => (string) $item->referral_status,
            default => $item->revoked_at ? 'revoked'
                : ($item->rejected_at ? 'rejected'
                : ($item->confirmed_at ? 'approved' : 'pending')),
        };
    }

    /** A student's side of a complaint, and its folder inside Complaints/. */
    private const COMPLAINT_SIDES = [
        'complainant' => 'As Complainant',
        'subject' => 'As Subject',
    ];

    /**
     * Download Archive form: one ZIP of every archived document for a school
     * year, a semester, or both, and/or one person, named
     * {tab}-{sy}-{semester}[-{id number}].zip, with one folder per document
     * type (all three for All Documents). For a student, Complaints/ holds a
     * folder per side ticked: As Complainant, As Subject.
     */
    public function downloadArchive(Request $request)
    {
        $data = $request->validate([
            'type' => 'required|in:all,complaint,referral,absent form',
            'school_year' => ['nullable', 'regex:/^\d{4}-\d{4}$/', 'required_without_all:semester,user_id'],
            'semester' => 'nullable|in:1,2',
            // Individual: the person who sent it, or for a student, their
            // side of it (complaint: complainant and/or subject; referral: referred).
            'user_id' => 'nullable|integer|exists:users,id',
            'sides' => 'nullable|array',
            'sides.*' => 'in:complainant,subject',
        ], [
            'school_year.required_without_all' => 'Choose a school year, a semester, or a person.',
        ]);

        $types = $data['type'] === 'all' ? self::ZIP_FOLDERS : [$data['type'] => self::ZIP_FOLDERS[$data['type']]];
        $person = ! empty($data['user_id']) ? \App\Models\User::find($data['user_id']) : null;
        // The complaint sides to include (as folders), for a student only.
        $sides = ($person?->role === 'student')
            ? array_values(array_intersect(array_keys(self::COMPLAINT_SIDES), $data['sides'] ?? array_keys(self::COMPLAINT_SIDES)))
            : null;
        if ($sides === [] && isset($types['complaint'])) {
            if (count($types) === 1) {
                throw \Illuminate\Validation\ValidationException::withMessages(['sides' => 'Tick As Complainant, As Subject, or both.']);
            }
            unset($types['complaint']);
        }

        // Each record with the folder(s) it goes in, under its type's folder.
        $placed = self::getDocuments('records')
            ->filter(fn ($r) => isset($types[$r->type]))
            ->map(fn ($r) => [$r, $person ? self::placements($r, $person, $sides) : ['']])
            ->filter(fn ($pair) => $pair[1] !== []);
        if ($placed->isEmpty()) {
            return response()->json(['message' => 'No archived documents for that period.'], 404);
        }

        $tempZipPath = storage_path('app/temp/'.Str::random(20).'.zip');
        File::ensureDirectoryExists(dirname($tempZipPath));
        $zip = new ZipArchive;
        if ($zip->open($tempZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Cannot create ZIP file.');
        }
        foreach ($types as $type => $folder) {
            $zip->addEmptyDir($folder);
            if ($type === 'complaint' && $sides) {
                foreach ($sides as $side) {
                    $zip->addEmptyDir($folder.'/'.self::COMPLAINT_SIDES[$side]);
                }
            }
        }

        foreach ($placed as [$record, $subFolders]) {
            $folderPath = self::folderFor($record->type, $record);
            if (! $folderPath) {
                continue;
            }
            foreach ($subFolders as $sub) {
                self::addRecordToZip($zip, $record, $folderPath, $types[$record->type].($sub !== '' ? '/'.$sub : '').'/'.basename($folderPath));
            }
        }
        $zip->close();

        return response()->download($tempZipPath, self::archiveZipName($data, $person))->deleteFileAfterSend(true);
    }

    /**
     * Where an archived record goes for the person picked in the Download
     * Archive form, as folders under its type's folder ('' = the type's
     * folder itself); none when it isn't theirs. Anyone gets what they sent.
     * A student also gets the referrals they were referred in, and their
     * complaints split by side ($sides): As Complainant, As Subject.
     */
    private static function placements($record, \App\Models\User $person, ?array $sides): array
    {
        $sentBy = ($record->usr->id ?? null) === $person->id;
        $named = fn () => collect($record->students ?? [])->contains(fn ($s) => (int) $s->student_id === $person->id);
        $isStudent = $person->role === 'student';

        return match ($record->type) {
            'complaint' => $isStudent
                ? array_values(array_filter([
                    in_array('complainant', $sides ?? [], true) && $sentBy ? self::COMPLAINT_SIDES['complainant'] : null,
                    in_array('subject', $sides ?? [], true) && $named() ? self::COMPLAINT_SIDES['subject'] : null,
                ]))
                : ($sentBy ? [''] : []),
            'referral' => ($sentBy || ($isStudent && $named())) ? [''] : [],
            'absent form' => (($record->student->id ?? null) === $person->id) ? [''] : [],
            default => [],
        };
    }

    /** e.g. all-documents-2025-2026-1st-semester.zip (same rule as archive.jsx). */
    private static function archiveZipName(array $data, ?\App\Models\User $person = null): string
    {
        $parts = [$data['type'] === 'all' ? 'all-documents' : Str::slug($data['type'])];
        if (! empty($data['school_year'])) {
            $parts[] = $data['school_year'];
        }
        if (! empty($data['semester'])) {
            $parts[] = $data['semester'] == 1 ? '1st-semester' : '2nd-semester';
        }

        // Individual: their ID number (or username) at the end.
        if ($person) {
            $parts[] = Str::slug($person->id_number ?: $person->username);
        }

        return implode('-', $parts).'.zip';
    }

    /**
     * Puts a record's saved files (its PDF and evidence) in the ZIP under
     * $dir. With no saved PDF (pending, rejected, revoked, or evidence only),
     * its PDF is built now and added. Returns how many files went in.
     */
    private static function addRecordToZip(ZipArchive $zip, $record, string $folderPath, string $dir): int
    {
        $files = is_dir($folderPath) ? File::allFiles($folderPath) : [];
        // A referral's form is always built from the record (none is saved);
        // skip any older saved copy so the zip has the current one.
        if ($record instanceof Referral) {
            $files = array_values(array_filter($files, fn ($f) => strtolower($f->getExtension()) !== 'pdf'));
        }
        $hasPdf = collect($files)->contains(fn ($f) => strtolower($f->getExtension()) === 'pdf');
        $added = 0;
        if (! $hasPdf && ($pdf = $record->renderDocumentPdf())) {
            $zip->addFromString($dir.'/'.basename($folderPath).'.pdf', $pdf->output());
            $added++;
        }
        foreach ($files as $file) {
            $zip->addFile($file->getRealPath(), $dir.'/'.str_replace(DIRECTORY_SEPARATOR, '/', $file->getRelativePathname()));
            $added++;
        }

        return $added;
    }

    public function downloadDocument($type, $id)
    {
        $id = decrypt_id($id) ?? abort(404);

        switch ($type) {

            case 'complaint':
                $doc = Complaint::findOrFail($id);
                $folderPath = storage_path("app/private/complaints/complaint-{$doc->complaint_number}");
                $zipName = "complaint-files-{$doc->complaint_number}.zip";
                break;

            case 'referral':
                $doc = Referral::findOrFail($id);
                $folderPath = storage_path("app/private/referrals/referral-{$doc->referral_number}");
                $zipName = "referral-files-{$doc->referral_number}.zip";
                break;

            case 'absent form': // allow both
                $doc = Absence::findOrFail($id);
                $folderPath = storage_path("app/private/absent-forms/absent-form-{$doc->form_number}");
                $zipName = "absence-files-{$doc->form_number}.zip";
                break;

            default:
                abort(404, 'Invalid type.');
        }

        // Create ZIP in temp directory
        $tempZipPath = storage_path('app/temp/'.Str::random(20).'.zip');
        File::ensureDirectoryExists(dirname($tempZipPath));

        $zip = new ZipArchive;
        if ($zip->open($tempZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, 'Cannot create ZIP file.');
        }
        // Its files at the ZIP's top level; a missing PDF (e.g. rejected) is built now.
        $added = self::addRecordToZip($zip, $doc, $folderPath, basename($folderPath));
        $zip->close();
        if ($added === 0) {
            @unlink($tempZipPath);
            abort(404, 'This record has no files.');
        }

        // Download + delete after response finishes
        return response()->download($tempZipPath, $zipName)->deleteFileAfterSend(true);
    }
}
