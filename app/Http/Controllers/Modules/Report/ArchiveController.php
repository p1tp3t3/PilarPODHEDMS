<?php

namespace App\Http\Controllers\Modules\Report;

use App\Http\Controllers\Controller;
use App\Http\Requests\Archive\DestroyDocumentRequest;
use App\Http\Requests\Archive\RecoverDocumentRequest;
use App\Http\Resources\ArchivedDocumentResource;
use App\Mail\AbsentFormMail;
use App\Models\Absence;
use App\Models\Complaint;
use App\Models\Referral;
use App\Models\Report;
use App\Models\SchoolYear;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use ZipArchive;
use Illuminate\Support\Str;

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
    ];

    /**
     * Every archivable type (complaint/referral/absent form) has an
     * associated document folder to clean up on disk.
     */
    private function folderFor(string $type, $record): ?string
    {
        return match ($type) {
            'complaint' => storage_path("app/private/complaints/complaint-{$record->complaint_number}"),
            'referral' => storage_path("app/private/referrals/referral-{$record->referral_number}"),
            'absent form' => storage_path("app/private/absent-forms/absent-form-{$record->form_number}"),
            default => null,
        };
    }

    public function index() {
        return Inertia::render('prefect/archive', [
            'user' => auth()->user(),
            'document' => self::getDocuments(),
            'school_years' => SchoolYear::orderByDesc('year')->pluck('year'),
        ]);
    }

    /**
     * Manually move one record into the archive, regardless of its
     * current status — the per-row "Archive" action on each list page.
     */
    public function transfer(Request $request) {
        $request->validate([
            'type' => 'required|in:complaint,referral,absent form',
            'id' => 'required|integer',
        ]);

        $model = self::$archivable[$request->type]['model'];
        $doc = $model::find($request->id);

        if (!$doc) {
            return response()->json(['message' => 'Document not found.'], 404);
        }

        $doc->update(['archived_at' => archive_retention_date()]);

        return response()->json(['message' => ucfirst($request->type) . ' archived successfully.']);
    }

    /**
     * Archive every not-yet-archived record (of one type, or all 5)
     * created within a date range or a school year.
     */
    public function bulkArchive(Request $request) {
        $request->validate([
            'type' => 'required|in:complaint,referral,absent form,all',
            'school_year' => 'nullable|string',
            'date_from' => 'nullable|date',
            'date_to' => 'nullable|date',
        ]);

        if ($request->filled('school_year')) {
            $resolved = Report::resolveSchoolYearDates(['school_year' => $request->school_year]);
            $dateFrom = $resolved['date_from'] ?? null;
            $dateTo = $resolved['date_to'] ?? null;
        } else {
            $dateFrom = $request->date_from;
            $dateTo = $request->date_to;
        }

        if (!$dateFrom || !$dateTo) {
            return response()->json(['message' => 'Please provide a valid date range or school year.'], 400);
        }

        $types = $request->type === 'all' ? array_keys(self::$archivable) : [$request->type];

        $counts = [];
        foreach ($types as $type) {
            $model = self::$archivable[$type]['model'];
            $counts[$type] = $model::whereBetween('created_at', [$dateFrom, $dateTo])
                ->whereNull('archived_at')
                ->update(['archived_at' => archive_retention_date()]);
        }

        return response()->json([
            'message' => 'Bulk archive complete.',
            'counts' => $counts,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ]);
    }

    public function destroy(DestroyDocumentRequest $request) {
        $model = self::$archivable[$request->type]['model'];
        $doc = $model::find($request->id);

        if (!$doc) {
            return response()->json(['message' => 'Document not found.'], 404);
        }
        // archived_at isn't cast to Carbon on these models — it's a plain
        // string from the DB, so it's parsed explicitly here.
        $archivedAt = $doc->archived_at ? \Carbon\Carbon::parse($doc->archived_at) : null;
        if (!$archivedAt || now()->lt($archivedAt)) {
            return response()->json([
                'message' => 'This record cannot be deleted until ' .
                    ($archivedAt ? $archivedAt->format('F j, Y') : 'it is archived') . '.',
            ], 403);
        }

        $folder = $this->folderFor($request->type, $doc);
        if ($folder && File::exists($folder)) {
            File::deleteDirectory($folder);
        }
        $doc->delete();

        return self::getDocuments();
    }

    public function recoverDocument(RecoverDocumentRequest $request) {
        if($request->type == 'complaint') {
            // Safely get the latest case number
            $lastCaseNumber = Complaint::whereNotNull('case_number')
                                        ->orderByDesc('case_number')
                                        ->value('case_number');

            // If no previous record, start at 1
            $nextCaseNumber = ($lastCaseNumber ?? 0) + 1;
            Complaint::where('id', $request->id)->update([
                'archived_at' => NULL,
                'rejected_reason' => NULL,
                'complaint_status' => 'ongoing',
                'case_number' => $nextCaseNumber
            ]);
            $complaint = Complaint::with('user.profile')->where('id', $request->id)->first();

            $webpushNotif = [
                'title' => 'Complaint Recovered',
                'body'  => 'Your complaint has been recovered from archive and is now ongoing.',
                'icon'  => '',
                'url'   => '/student/complaint/view/' . $complaint->id,
            ];

            notify_single_user(
                [
                    'sender_id'   => auth()->user()->id,
                    'receiver_id' => $complaint->user->id,
                    'notif_type'  => 'complaint',
                    'content'     => json_encode([
                        'sender_id'   => auth()->user()->id,
                        'receiver_id' => $complaint->user->id,
                        'message'     => 'Your complaint has been recovered from archive and is now ongoing.',
                    ]),
                ],
                $webpushNotif
            );

        }if($request->type == 'referral') {
            // "Recover" means "put it back in an active, actionable
            // state" — mirrors exactly what complaint's recovery does,
            // just without a case-number-style field to reassign.
            Referral::where('id', $request->id)->update([
                'archived_at' => NULL,
                'rejected_reason' => NULL,
                'revoked_at' => NULL,
                'referral_status' => 'pending',
            ]);
        }if($request->type == 'absent form') {
            Absence::where('id', $request->id)->update([
                'archived_at' => NULL,
            ]);
            $student = Absence::with(['user.profile', 'user.program'])->where('id', $request->id)->first();


            //generate pdf file with watermark as approved absent form
            // File path setup
            $folderPath = storage_path('app/private/absent-forms/absent-form-' . $student->form_number);
            $pdfPath    = $folderPath . '/absent-form-approval-' . $student->user->id . '-' . $student->form_number . '.pdf';

            if (!is_dir($folderPath)) {
                File::makeDirectory($folderPath, 0755, true, true);
            }

            // --- Generate PDF (must succeed) ---
            $prefectName = auth()->user()->profile?->first_name . ' ' . auth()->user()->profile?->middle_name . ' ' . auth()->user()->profile?->last_name;
            $studentName = $student->user->profile?->first_name . ' ' . $student->user->profile?->middle_name . ' ' . $student->user->profile?->last_name;
            $pdfData = [
                'sender_name' => $studentName,
                'prefect_name' => $prefectName,
                'date_from'    => $student->date_from,
                'date_to'      => $student->date_to,
                'reason'       => implode(', ', json_decode($student->reason, true)),
                'date_approve' => now()->toFormattedDateString(),
                'status' => 'Approved',
                'note'         => $student->note,
                'program'      => $student->user->program?->name,
                'student_id'   => $student->user->id_number
            ];

            try {
                $pdf = Pdf::loadView("pdf.absent-form-approval", $pdfData);
                $pdf->save($pdfPath);
            } catch (\Exception $pdfErr) {
                throw new \Exception("PDF generation error: " . $pdfErr->getMessage());
            }

            // --- Email must succeed ---


            $emailData = [
                'sender_name'  => $prefectName,
                'student_name' => $studentName,
                'prefect_name' => $prefectName,
                'date_from'    => $student->date_from,
                'date_to'      => $student->date_to,
                'reason'       => implode(', ', json_decode($student->reason, true)),
                'confirmed_at' => now()->toFormattedDateString(),
                'file'         => 'absent-forms/absent-form-' . $student->form_number . '/absent-form-approval-' . $student->user->id . '-' . $student->form_number . '.pdf',
            ];

            try {
                Mail::to($student->user->email)
                    ->send(
                        (new AbsentFormMail($emailData))
                            ->attach($pdfPath, [
                                'as'   => 'APPROVED-ABSENT-FORM.pdf',
                                'mime' => 'application/pdf',
                            ])
                    );
            } catch (\Exception $mailErr) {
                throw new \Exception("Email sending error: " . $mailErr->getMessage());
            }
        }

        return self::getDocuments();
    }

    public function getDocuments($type = 'paginate')
    {
        $filterType = request()->input('type', 'all');
        $search = strtolower(request()->input('search', ''));

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
                'subject.profile',
                'subject.program',
                'subject.enrollments',
                'subject.teachingStaff.program',
                'complaintSubject.user.profile',
                'complaintSubject.user.program',
                'complaintSubject.user.enrollments',
                'complaintSubject.user.teachingStaff.program'
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
        });


        // -----------------------
        // 2. REFERRAL
        // -----------------------
        $referral = Referral::with([
                'user.profile',
                'user.program',
                'user.enrollments',
                'referredStudent.profile',
                'referredStudent.program',
                'referredStudent.enrollments',
                'referralReferredStudent.user.profile',
                'referralReferredStudent.user.program',
                'referralReferredStudent.user.enrollments'
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
        });


        // -----------------------
        // 4. MERGE
        // -----------------------
        $merged = $complaint
            ->concat($referral)
            ->concat($absent)
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

        // -----------------------
        // 8. SEARCH FILTER
        // -----------------------
        if (!empty($search)) {

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

                return false;
            })->values();
        }




        $paginated = $merged;
        if($type == 'paginate') {
            // -----------------------
            // 9. PAGINATION
            // -----------------------
            $page = request()->input('page', 1);
            $perPage = request()->input('per_page', 10);
            $offset = ($page - 1) * $perPage;

            $paginated = new \Illuminate\Pagination\LengthAwarePaginator(
                $merged->slice($offset, $perPage)->values(),
                $merged->count(),
                $perPage,
                $page,
                [
                    'path' => request()->url(),
                    'query' => request()->query()
                ]
            );
        }

        return ArchivedDocumentResource::collection($paginated);
    }
    public function matchStudentSearch($user, $search, $parts)
    {
        $profile = $user->profile;
        $first  = strtolower($profile->first_name ?? '');
        $middle = strtolower($profile->middle_name ?? '');
        $last   = strtolower($profile->last_name ?? '');
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

    public function downloadDocument($type, $id)
    {
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
                abort(404, "Invalid type.");
        }

        if (!is_dir($folderPath)) {
            abort(404, "Document folder not found.");
        }

        // Create ZIP in temp directory
        $tempZipPath = storage_path("app/temp/" . Str::random(20) . ".zip");

        if (!file_exists(dirname($tempZipPath))) {
            mkdir(dirname($tempZipPath), 0775, true);
        }

        $zip = new ZipArchive;
        if ($zip->open($tempZipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            abort(500, "Cannot create ZIP file.");
        }

        // Add all files inside folder
        $files = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($folderPath, \FilesystemIterator::SKIP_DOTS)
        );

        foreach ($files as $file) {
            $filePath = $file->getRealPath();
            $relativePath = substr($filePath, strlen($folderPath) + 1);
            $zip->addFile($filePath, $relativePath);
        }

        $zip->close();

        // Download + delete after response finishes
        return response()->download($tempZipPath, $zipName)->deleteFileAfterSend(true);
    }
}
