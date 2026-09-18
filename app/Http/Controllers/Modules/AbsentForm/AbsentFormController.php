<?php

namespace App\Http\Controllers\Modules\AbsentForm;

use App\Http\Controllers\Controller;
use App\Http\Requests\AbsentForm\CancelAbsentFormRequest;
use App\Http\Requests\AbsentForm\ConfirmAbsentFormRequest;
use App\Http\Requests\AbsentForm\StoreAbsentFormRequest;
use App\Http\Requests\AbsentForm\UpdateAbsentFormRequest;
use App\Http\Resources\AbsenceResource;
use App\Mail\AbsentFormMail;
use App\Models\Absence;
use App\Models\AbsenceRevision;
use App\Models\ActionLog;
use App\Models\SchoolYear;
use App\Models\SchoolYearSemester;
use App\Models\User;
use App\Traits\GeneratesSequenceCode;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class AbsentFormController extends Controller
{
    use GeneratesSequenceCode;

    public function index()
    {
        $isPrefect = self::isPrefect() ? 'prefect' : 'student';
        $user = auth()->user();
        $user->allow_absent_form = $user->permissions?->allow_absent_form;
        $props = [
            'user' => $user,
        ];
        if (self::isPrefect()) {
            $props = array_merge($props, [
                'absent_form_request_list' => self::getAllAbsentForm(),
                'school_years' => SchoolYear::orderByDesc('year')->pluck('year'),
            ]);
        } else {
            $props = array_merge($props, [
                'absent_form_list' => AbsenceResource::collection(
                    Absence::where('student_id', $user->id)->latest('created_at')->get()
                ),
            ]);
        }

        return Inertia::render("$isPrefect/absent-form", $props);
    }

    public function store(StoreAbsentFormRequest $request)
    {
        if (auth()->user()->permissions?->allow_absent_form != 1) {
            return response()->json(['message' => 'You are restricted to submit an absent form'], 403);
        }

        $evidenceFiles = $request->file('evidence');
        $formNumber = $this->generateSequenceCode(Absence::class, 'form_number');

        DB::beginTransaction();

        $folder = null; // for cleanup later

        try {

            // Insert DB entry
            $absenceId = Absence::insertGetId([
                'form_number' => $formNumber,
                'student_id' => auth()->user()->id,
                'reason' => json_encode($request->reason),
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
                'school_year_semester_id' => SchoolYearSemester::currentId(),
            ]);

            ActionLog::create([
                'user_id' => auth()->user()->id,
                'action_type' => 'absent form',
                'details' => 'submits an absent form to the prefect',
            ]);

            // Create folder + save evidence pictures
            $folder = storage_path('app/private/absent-forms/absent-form-'.$formNumber);
            $evidencesFolder = "{$folder}/evidences";
            File::makeDirectory($evidencesFolder, 0755, true, true);

            $evidences = [];
            $i = 1;
            foreach ($evidenceFiles as $evidenceFile) {
                $extension = $evidenceFile->getClientOriginalExtension();
                $fileName = "{$i}-{$formNumber}.{$extension}";
                $evidenceFile->move($evidencesFolder, $fileName);
                $evidences[] = ['file' => $fileName];
                $i++;
            }

            Absence::where('id', $absenceId)->update(['evidences' => json_encode($evidences)]);

            DB::commit(); // All OK

        } catch (\Exception $e) {

            DB::rollBack(); // rollback database changes

            // DELETE folder if it was created
            if ($folder && File::exists($folder)) {
                File::deleteDirectory($folder);
            }

            return response()->json([
                'message' => 'Failed to submit absent form.',
                'error' => $e->getMessage(),
            ], 500);
        }

        // Notification (best-effort only)
        try {
            $sender = auth()->user()->profile?->first_name.' '.auth()->user()->profile?->last_name;

            $webpushNotif = [
                'title' => 'Absent Form Submission!',
                'body' => "$sender submits an Absent Form",
                'icon' => Storage::disk('public')->url('profile-pictures/'.auth()->user()->profile?->profile_picture),
                'url' => url('/prefect/absent-form'),
            ];

            $prefectId = User::where('role', 'sub_admin')->value('id');

            notify_single_user(
                self::getAbsentFormSubmissionNotifMessage($absenceId, $prefectId),
                $webpushNotif
            );

        } catch (\Exception $notifyError) {
            Log::error("Notification failed for absence ID $absenceId: ".$notifyError->getMessage());
        }

        return response()->json(['message' => 'success']);
    }

    public function downloadEvidence($id, $fileName)
    {
        $fileName = basename($fileName);
        $formNumber = Absence::where('id', $id)->value('form_number');
        $path = storage_path("app/private/absent-forms/absent-form-{$formNumber}/evidences/$fileName");

        if (! file_exists($path)) {
            abort(404);
        }

        return response()->file($path, [
            'Content-Type' => mime_content_type($path),
        ]);
    }

    // Evidence that existed before the absent form's one-time edit — copied
    // into its own folder at edit time, see updateAbsentForm().
    public function downloadPreviousEvidence($id, $fileName)
    {
        $fileName = basename($fileName);
        $formNumber = Absence::where('id', $id)->value('form_number');
        $path = storage_path("app/private/absent-forms/absent-form-{$formNumber}/previous_evidences/$fileName");

        if (! file_exists($path)) {
            abort(404);
        }

        return response()->file($path, [
            'Content-Type' => mime_content_type($path),
        ]);
    }

    /**
     * Lets the student edit their own absent form exactly once, and only
     * while it's still pending (before the prefect has noted/rejected it).
     * Mirrors ComplaintController::updateComplaint(): a log, not a
     * destructive edit — the pre-edit state (reason/dates/evidence) is
     * snapshotted into absence_revision, and a "removed" evidence file is
     * copied into previous_evidences/ before being dropped from evidences/.
     */
    public function updateAbsentForm(UpdateAbsentFormRequest $request, $id)
    {
        $absence = Absence::where('id', $id)->first();

        if (! $absence) {
            return response()->json(['message' => 'Absent form not found.'], 404);
        }
        if ($absence->student_id !== auth()->id()) {
            return response()->json(['message' => 'You can only edit an absent form you filed yourself.'], 403);
        }
        if ($absence->confirmed_at !== null || $absence->rejected_at !== null || $absence->revoked_at !== null) {
            return response()->json(['message' => 'This absent form can no longer be edited.'], 400);
        }
        if ($absence->edited_at !== null) {
            return response()->json(['message' => 'You have already used your one edit for this absent form.'], 400);
        }

        DB::beginTransaction();
        try {
            AbsenceRevision::create([
                'absence_id' => $id,
                'reason' => $absence->reason,
                'date_from' => $absence->date_from,
                'date_to' => $absence->date_to,
                'evidences' => $absence->evidences,
                'created_at' => now(),
            ]);

            $folder = storage_path("app/private/absent-forms/absent-form-{$absence->form_number}");
            $evidencesFolder = "{$folder}/evidences";
            $previousEvidencesFolder = "{$folder}/previous_evidences";
            $existing = $absence->evidences ? json_decode($absence->evidences, true) : [];

            if (! empty($existing)) {
                File::ensureDirectoryExists($previousEvidencesFolder);
                foreach ($existing as $e) {
                    $src = "{$evidencesFolder}/{$e['file']}";
                    if (File::exists($src)) {
                        File::copy($src, "{$previousEvidencesFolder}/{$e['file']}");
                    }
                }
            }

            if ($request->has('hidden_evidence_files')) {
                $hiddenFiles = json_decode($request->hidden_evidence_files, true) ?? [];
                foreach ($existing as $e) {
                    if (in_array($e['file'], $hiddenFiles) && File::exists("{$evidencesFolder}/{$e['file']}")) {
                        File::delete("{$evidencesFolder}/{$e['file']}");
                    }
                }
                $existing = array_values(array_filter($existing, fn ($e) => ! in_array($e['file'], $hiddenFiles)));
            }

            $newEvidence = array_filter($request->file('evidence') ?? []);
            if (! empty($newEvidence)) {
                File::ensureDirectoryExists($evidencesFolder);
                $i = count($existing) + 1;

                foreach ($newEvidence as $e) {
                    $extension = $e->getClientOriginalExtension();
                    $fileName = "{$i}-{$absence->form_number}.{$extension}";
                    $e->move($evidencesFolder, $fileName);
                    $existing[] = ['file' => $fileName];
                    $i++;
                }
            }

            $oldDateFrom = $absence->date_from;
            $oldDateTo = $absence->date_to;

            $absence->update([
                'reason' => json_encode($request->reason),
                'date_from' => $request->date_from,
                'date_to' => $request->date_to,
                'evidences' => json_encode($existing),
                'edited_at' => now(),
            ]);

            $changes = [];
            if ((string) $oldDateFrom !== (string) $request->date_from) {
                $changes['date_from'] = ['from' => $oldDateFrom, 'to' => $request->date_from];
            }
            if ((string) $oldDateTo !== (string) $request->date_to) {
                $changes['date_to'] = ['from' => $oldDateTo, 'to' => $request->date_to];
            }

            ActionLog::log(
                auth()->id(),
                'absent form',
                "Edited their own absent form (#{$absence->form_number})",
                $changes
            );

            DB::commit();

            return response()->json(['message' => 'success']);
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json(['message' => 'Error updating absent form', 'error' => $e->getMessage()], 500);
        }
    }

    public function confirmAbsentForm($id, ConfirmAbsentFormRequest $request)
    {
        $pdfFile = null;
        DB::beginTransaction();

        try {
            $student = Absence::with(['user.profile', 'user.program', 'user.enrollments'])->findOrFail($id);

            Absence::where('id', $id)->update([
                'confirmed_at' => now(),
                'note' => $request->note,
                'archived_at' => archive_retention_date(),
                'confirmed_school_year_semester_id' => SchoolYearSemester::currentId(),
            ]);

            $student->refresh();
            $student->load(['user.profile', 'user.program', 'user.enrollments']);

            ActionLog::log(
                auth()->user()->id,
                'absent form',
                'Noted and approved the absent form of '.$student->user->profile?->first_name,
                ['status' => ['from' => 'pending', 'to' => 'confirmed']]
            );

            // File path setup
            $folderPath = storage_path('app/private/absent-forms/absent-form-'.$student->form_number);
            $pdfPath = "{$folderPath}/absent-form-approval-{$student->user->id}-{$student->form_number}.pdf";

            if (! is_dir($folderPath)) {
                File::makeDirectory($folderPath, 0755, true, true);
            }

            // --- Generate PDF (must succeed) ---
            $prefectName = auth()->user()->profile?->first_name.' '.auth()->user()->profile?->middle_name.' '.auth()->user()->profile?->last_name;
            $studentName = $student->user->profile?->first_name.' '.$student->user->profile?->middle_name.' '.$student->user->profile?->last_name;
            $pdfData = [
                'sender_name' => $studentName,
                'prefect_name' => $prefectName,
                'date_from' => $student->date_from,
                'date_to' => $student->date_to,
                'reason' => implode(', ', json_decode($student->reason, true)),
                'date_approve' => now()->toFormattedDateString(),
                'status' => 'Approved',
                'note' => $student->note,
                'program' => $student->user->program?->name,
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
            DB::commit(); // Everything succeeded

        } catch (\Exception $e) {

            DB::rollBack(); // Undo DB changes

            // Cleanup generated PDF if present
            if (isset($pdfPath) && file_exists($pdfPath)) {
                unlink($pdfPath);
            }

            return response()->json([
                'message' => 'Failed to approve absence form.',
                'error' => $e->getMessage(),
            ], 500);
        }

        // --- WebPush (non-critical) ---
        try {
            notify_single_user(
                self::getAbsentFormConfirmationNotifMessage($id, $student->user->id),
                [
                    'title' => "Hello {$student->user->profile?->first_name}",
                    'body' => 'Your Absent Form has been Approved',
                    'icon' => Storage::disk('public')->url('profile-pictures/'.$student->user->profile?->profile_picture),
                    'url' => url('/absent-form'),
                ]
            );
        } catch (\Exception $e) {
            Log::error("WebPush failed for absence ID {$id}: ".$e->getMessage());
        }

        return self::getAllAbsentForm();
    }

    public function getAllAbsentFormRequest()
    {
        return Absence::with(['user.profile', 'user.program', 'user.enrollments'])
            ->where('confirmed_at', null)
            ->latest('created_at');
    }

    /**
     * Every absent form a student has ever filed — surfaced as the "Absent
     * Forms Filed" tab on their own profile, mirroring
     * ComplaintController::getComplainantComplaint().
     */
    public function getStudentAbsentForms($id)
    {
        return Absence::with(['user.profile', 'schoolYearSemester.schoolYear'])
            ->where('student_id', $id)
            ->latest('created_at')
            ->get();
    }

    // "Pending" excludes forms whose date_to has already passed without any
    // action taken on them — those are surfaced under "Expired" instead of
    // sitting in Pending forever, since Absence (unlike GatePass) has no
    // separate expiration field to key off of; only rejected/revoked/noted
    // set archived_at, so those three branches deliberately don't also
    // filter on it (they'd otherwise always come back empty).
    public function getAllAbsentForm()
    {
        $status = request()->has('status') ? request()->status : null;
        $absence = Absence::with(['user.profile', 'user.program', 'user.enrollments']);
        $today = now()->toDateString();

        if ($status === 'all') {
            $absence->latest('created_at');
        } elseif ($status === 'expired') {
            $absence->whereNull('confirmed_at')->whereNull('rejected_at')->whereNull('revoked_at')
                ->whereDate('date_to', '<', $today)
                ->latest('date_to');
        } elseif ($status === 'noted') {
            $absence->whereNotNull('confirmed_at')->latest('confirmed_at');
        } elseif ($status === 'rejected') {
            $absence->whereNotNull('rejected_at')->latest('rejected_at');
        } elseif ($status === 'revoked') {
            $absence->whereNotNull('revoked_at')->latest('revoked_at');
        } else {
            $absence->whereNull('confirmed_at')->whereNull('rejected_at')->whereNull('revoked_at')
                ->whereDate('date_to', '>=', $today)
                ->latest('created_at');
        }

        if (request('school-year') && request('school-year') != 'all') {
            $absence->whereHas('schoolYearSemester', function ($q) {
                $q->whereHas('schoolYear', fn ($sq) => $sq->where('year', request('school-year')));
            });
        }
        if (request('semester') && request('semester') != 'all') {
            $absence->whereHas('schoolYearSemester', function ($q) {
                $q->where('semester', request('semester'));
            });
        }

        return AbsenceResource::collection($absence->paginate(100)->appends(['status' => $status]));
    }

    public function get($id)
    {
        return new AbsenceResource(Absence::with(['user.profile', 'user.program', 'user.enrollments', 'revisions'])
            ->where('id', $id)
            ->first());
    }

    public function cancelAbsentForm(CancelAbsentFormRequest $request, $id)
    {
        $absent = Absence::with('user.profile')->where('id', $id);

        $absent->update([
            'rejected_reason' => $request->reason,
            'rejected_at' => now(),
            'archived_at' => archive_retention_date(),
            'rejected_school_year_semester_id' => SchoolYearSemester::currentId(),
        ]);
        $record = $absent->first();
        ActionLog::log(
            auth()->user()->id,
            'absent form',
            'Rejected the absent form of '.$record->user->profile?->first_name,
            ['status' => ['from' => 'pending', 'to' => 'rejected']]
        );
        // --- WebPush (non-critical) ---
        try {
            notify_single_user(
                self::getAbsentFormRejectNotifMessage($id, $record->user->id),
                [
                    'title' => "Hello {$record->user->profile?->first_name}",
                    'body' => 'Your Absent Form has been rejected',
                    'icon' => Storage::disk('public')->url('profile-pictures/'.$record->user->profile?->profile_picture),
                    'url' => url('/absent-form'),
                ]
            );
        } catch (\Exception $e) {
            Log::error("WebPush failed for absence ID {$id}: ".$e->getMessage());
        }

        return self::getAllAbsentForm();
    }

    /**
     * Lets the student withdraw their own pending absent form. Soft delete,
     * not a hard delete — mirrors GatePassController::revokeGatePass().
     */
    public function revokeAbsentForm($id)
    {
        $absence = Absence::with('user.profile')->where('id', $id)->first();

        if (! $absence) {
            return response()->json(['message' => 'Absent form not found.'], 404);
        }
        if ($absence->student_id !== auth()->id()) {
            return response()->json(['message' => 'You can only revoke an absent form you filed yourself.'], 403);
        }
        if ($absence->confirmed_at !== null || $absence->rejected_at !== null || $absence->revoked_at !== null) {
            return response()->json(['message' => 'This absent form can no longer be revoked.'], 400);
        }

        $absence->update([
            'revoked_at' => now(),
            'archived_at' => archive_retention_date(),
            'revoked_school_year_semester_id' => SchoolYearSemester::currentId(),
        ]);

        ActionLog::log(
            auth()->id(),
            'absent form',
            "Revoked their own absent form (#{$absence->form_number})",
            ['status' => ['from' => 'pending', 'to' => 'revoked']]
        );

        return response()->json(['message' => 'success']);
    }

    private function isPrefect()
    {
        return auth()->user()->role == 'sub_admin';
    }

    private function getAbsentFormSubmissionNotifMessage($absentFormId, $receiver)
    {
        $name = auth()->user()->profile?->first_name.' '.auth()->user()->profile?->last_name;
        $sender = auth()->user()->id;

        return [
            'notif_type' => 'absent',
            'sender_id' => $sender,
            'receiver_id' => $receiver,
            'content' => json_encode([
                'id' => $absentFormId,
                'sender_notif_message' => 'You Have Submitted an Absent Form.',
                'receiver_notif_message' => "$name Has Submitted an Absent Form.",
            ]),
            'read_since' => null,
        ];
    }

    private function getAbsentFormConfirmationNotifMessage($absentFormId, $receiver)
    {
        $sender = auth()->user()->id;

        return [
            'notif_type' => 'absent',
            'sender_id' => $sender,
            'receiver_id' => $receiver,
            'content' => json_encode([
                'id' => $absentFormId,
                'sender_notif_message' => 'You Have Submitted an Absent Form.',
                'receiver_notif_message' => 'Your Submitted Absent Form Has Been Approved.',
            ]),
            'read_since' => null,
        ];
    }

    private function getAbsentFormRejectNotifMessage($absentFormId, $receiver)
    {
        $sender = auth()->user()->id;

        return [
            'notif_type' => 'absent',
            'sender_id' => $sender,
            'receiver_id' => $receiver,
            'content' => json_encode([
                'id' => $absentFormId,
                'sender_notif_message' => 'You Have Submitted an Absent Form.',
                'receiver_notif_message' => 'Your Submitted Absent Form Has Been Rejected.',
            ]),
            'read_since' => null,
        ];
    }
}
