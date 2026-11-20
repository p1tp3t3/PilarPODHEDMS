<?php

namespace App\Http\Controllers\Modules\Referral;

use App\Events\SendReferral;
use App\Http\Controllers\Controller;
use App\Http\Requests\Referral\StoreReferralRequest;
use App\Http\Requests\Referral\UpdateReferralRequest;
use App\Http\Resources\Referral\ReferralResource;
use App\Mail\ReferralMail;
use App\Models\ActionLog;
use App\Models\Enrollment;
use App\Models\NonTeachingStaff;
use App\Models\Position;
use App\Models\Program;
use App\Models\Referral;
use App\Models\ReferralReferredStudent;
use App\Models\ReferralRevision;
use App\Models\SchoolYear;
use App\Models\SchoolYearSemester;
use App\Models\User;
use App\Traits\GeneratesSequenceCode;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use App\Http\Resources\System\ProgramResource;
use App\Http\Resources\Account\UserResource;

class ReferralController extends Controller
{
    use GeneratesSequenceCode;

    // Program heads and faculty may only refer students of their own program(s) — the
    // prefect can refer anyone. Returns an error response, or null if fine.
    private static function outsideProgramResponse($studentIds)
    {
        if (! auth()->user()->isTeacher()) {
            return null;
        }
        $programIds = \App\Models\User::teachingProgramIdsFor(auth()->id());
        $allowed = User::whereIn('id', collect($studentIds))
            ->whereHas('latestEnrollment', fn ($q) => $q->whereIn('program_id', $programIds))
            ->pluck('id');
        if (collect($studentIds)->map(fn ($id) => (int) $id)->diff($allowed)->isNotEmpty()) {
            return response()->json(['message' => 'You can only refer students from your own program.'], 422);
        }

        return null;
    }

    // Students are never shown referrals (not even ones about them) and
    // can't file or touch one.
    private static function denyStudents(): void
    {
        abort_if(auth()->user()?->role === 'student', 403);
    }

    public function index()
    {
        self::denyStudents();
        $isPrefect = self::isPrefect() ? 'prefect' : 'shared';
        $user = auth()->user();
        $user->allow_referral = $user->permissions?->allow_referral;
        $props = [
            'user' => new UserResource($user),
            'students' => fn () => UserResource::collection(User::with(['profile', 'program'])
                ->whereRole('student')
                ->where('id', '!=', auth()->user()->id)
                ->get()),
            // The table: loaded by the page from its API endpoint (list_page()).
            'referral' => list_prop(fn () => self::getAllReferral()),
            'program_name' => is_program_head(),
            'school_years' => SchoolYear::orderByDesc('year')->pluck('year'),
            'programs' => ProgramResource::collection(Program::orderBy('code')->get(['id', 'code'])),
        ];
        return list_page("$isPrefect/referral", $props);
    }

    /**
     * The offices a referral can be sent on to — Guidance and IT Staff
     * (non_teaching_staff positions, not roles) — see the referrals the
     * prefect sent them, and write a note back on each. They never file a
     * referral themselves.
     */
    public function guidanceIndex()
    {
        if (! Referral::officeOf(auth()->user())) {
            return redirect('/dashboard');
        }

        return list_page('guidance/referral', [
            'referral' => list_prop(fn () => self::getAllReferral()),
            'school_years' => SchoolYear::orderByDesc('year')->pluck('year'),
        ]);
    }

    public function store(StoreReferralRequest $request)
    {
        self::denyStudents();
        if ($blocked = self::outsideProgramResponse($request->referred_students ?? [])) {
            return $blocked;
        }
        DB::beginTransaction(); // ✅ Start transaction
        $output = null; // File path tracker for cleanup if fails

        try {

            if (auth()->user()->permissions?->allow_referral != 1) {
                return response()->json([
                    'message' => 'You are being restricted for submitting referral',
                ], 400);
            }

            $field = [
                'referrer_id' => $request->referrer_id,
                'reason_description' => $request->referral_reason,
                'referral_number' => $this->generateSequenceCode(Referral::class, 'referral_number'),
            ];

            // 🧍 If the user is not a sub_admin (prefect)
            if (auth()->user()->role != 'sub_admin') {
                $prefect = User::whereRole('sub_admin')
                    ->where('activate', true)
                    ->firstOrFail();

                $lastIndex = Referral::insertGetId($field);

                foreach ($request->referred_students as $s) {
                    ReferralReferredStudent::insert([
                        'referral_id' => $lastIndex,
                        'student_id' => $s,
                    ]);
                }

                $referral = Referral::with(['user.profile', 'referredStudent.profile'])
                    ->where('id', $lastIndex)
                    ->first();

                $studentName = $referral->referredStudent->profile?->first_name;

                notify_single_user(
                    self::getReferralNotifMessageReportFields($request, $prefect, $lastIndex, $referral),
                    new SendReferral($prefect->id)
                );

                ActionLog::create([
                    'user_id' => auth()->user()->id,
                    'action_type' => 'referral',
                    'details' => 'Reports a referral to the prefect',
                ]);

                DB::commit(); // ✅ Everything succeeded

                return response()->json($studentName);
            }

            // 👮 If user is a sub_admin (prefect)
            $prefect = User::with('profile')
                ->whereRole('sub_admin')
                ->firstOrFail();

            $lastIndex = Referral::insertGetId(array_merge($field, [
                // The prefect filing for a referrer (teacher) is recorded;
                // not when the prefect is the referrer themselves.
                'prefect_id' => (int) $request->referrer_id !== (int) auth()->id() ? auth()->id() : null,
                'confirmed_at' => DB::raw('NOW()'),
                'archived_at' => archive_retention_date(),
            ]));

            foreach ($request->referred_students as $s) {
                ReferralReferredStudent::insert([
                    'referral_id' => $lastIndex,
                    'student_id' => $s,
                ]);
            }

            // No referral form is saved: it is built from the record whenever
            // it's needed (viewing, sending, archive download).

            ActionLog::create([
                'user_id' => auth()->user()->id,
                'action_type' => 'referral',
                'details' => 'Reports a referral against a student',
            ]);

            DB::commit(); // ✅ Success

            return self::getAllReferral();

        } catch (\Throwable $e) {
            DB::rollBack(); // ❌ Rollback database changes

            // ❌ If a file was generated before the error, delete it
            if ($output && File::exists($output)) {
                try {
                    File::delete($output);
                    Log::warning("Cleaned up partial referral file: {$output}");
                } catch (\Throwable $cleanupError) {
                    Log::error('Failed to delete partial file after rollback', [
                        'file' => $output,
                        'cleanup_error' => $cleanupError->getMessage(),
                    ]);
                }
            }

            Log::error('Referral store failed', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
                'file' => $e->getFile(),
            ]);

            return response()->json([
                'message' => 'An error occurred while creating the referral.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getAllReferral()
    {
        $status = request()->get('status');

        $referrals = Referral::with([
            'user.profile',
            'user.faculty.program', 'user.headships.program',
            'referredStudent.program',
        ]);

        // The prefect sees everything; Guidance / IT Staff only what was sent
        // to their office; everyone else only what they filed.
        $office = auth()->user()->role === 'sub_admin' ? null : Referral::officeOf(auth()->user());
        if ($office) {
            // Sent referrals are approved, so no status tabs: all of them,
            // the latest sent first.
            $referrals->sentToOffice($office)->with('officeNoteBy.profile')->whereNull('revoked_at')->latest('sent_at')->latest('created_at');
            SchoolYearSemester::applyFilter($referrals, 'created_at', request('school-year'), request('semester'));

            return ['data' => ReferralResource::collection($referrals->get())];
        }
        if (auth()->user()->role != 'sub_admin') {
            $referrals->where('referrer_id', auth()->user()->id);
        }

        // A referral has no in-between "ongoing" phase like a complaint
        // does — filed -> approved/rejected/revoked are all terminal
        // states, so "pending" just means none of those three timestamps
        // are set yet. archived_at is set the moment any of those three
        // happen (a retention deadline, not an "is archived" flag — see
        // archive_retention_date()), so it's deliberately not used to gate
        // this list, only status/timestamp fields are.
        // The prefect's approved referrals live in the archive only, not on
        // the referral page (no Approved tab, and left out of "All").
        $prefectView = auth()->user()->role === 'sub_admin';
        if ($prefectView) {
            $referrals->whereNull('confirmed_at');
        }
        // Revoked referrals are in the prefect's Archive only (no Revoked
        // tab anywhere); an old ?status=revoked link gets All.
        $referrals->whereNull('revoked_at');
        if ($status === 'revoked') {
            $status = 'all';
        }

        if ($status === 'approve' && ! $prefectView) {
            $referrals->whereNotNull('confirmed_at')->latest('confirmed_at');
        } elseif ($status === 'rejected') {
            $referrals->whereNotNull('rejected_at')->whereNull('confirmed_at')->latest('rejected_at');
        } elseif ($status === 'all') {
            $referrals->latest('created_at');
        } else {
            // Pending: newest first (the dashboard's Up next keeps the queue).
            $referrals->whereNull('confirmed_at')->whereNull('rejected_at')->whereNull('revoked_at')->latest('created_at');
        }

        SchoolYearSemester::applyFilter($referrals, 'created_at', request('school-year'), request('semester'));
        // ?id= (from the dashboard's Up next panel): only that one row.
        if (is_numeric(request('id'))) {
            $referrals->where('id', (int) request('id'));
        }

        // Program: referrals naming at least one student of that program.
        $program = request('program');
        if ($program && $program !== 'all') {
            $referrals->whereHas('referralReferredStudent', fn ($q) => $q->whereIn('student_id', Enrollment::studentIdsInProgram($program)));
        }

        // Every row (the table paginates in the browser), as { data: [...] }.
        return ['data' => ReferralResource::collection($referrals->get())];
    }

    /**
     * Every referral a program head or faculty member has
     * filed as the referrer — surfaced as the "Referral Filed" tab on their
     * own profile, mirroring ComplaintController::getComplainantComplaint().
     */
    public function getReferrerReferral($id)
    {
        return ['data' => ReferralResource::collection(
            Referral::with(['user.profile', 'referredStudent.profile', 'referredStudent.program'])
                ->where('referrer_id', $id)
                ->latest('created_at')
                ->get()
        )];
    }

    public function confirmReferral($id)
    {
        // Pending or rejected ones can be approved: a rejected referral can
        // still be approved later (e.g. once more evidence comes in). Its
        // rejection date and reason stay as history.
        $current = Referral::findOrFail($id);
        if ($current->confirmed_at || $current->revoked_at) {
            return response()->json(['message' => 'This referral can no longer be approved.'], 409);
        }

        $this->approve($current);

        return self::getAllReferral();
    }

    /**
     * Approve a referral: mark it approved and notify the referrer. Used by Approve and by "Send to" (sending a pending or
     * rejected referral on approves it first).
     */
    private function approve(Referral $referral): void
    {
        $id = $referral->id;
        Referral::where('id', $id)->update([
            'referral_status' => 'approved',
            'confirmed_at' => now(),
            'archived_at' => archive_retention_date(),
        ]);

        // No referral form is saved on approval: it is built from the record
        // whenever it's needed (viewing, sending, archive download).
        $fresh = Referral::with(['user.profile', 'referredStudent.profile'])->where('id', $id)->first();

        notify_single_user(
            self::getReferralNotifMessageResponseFields($fresh)
        );
    }

    /**
     * Lets the referrer withdraw their own referral. Soft delete, not a
     * hard delete — same archived_at retention convention as the prefect's
     * own reject (destroy()) uses, so it still shows up for the prefect via
     * the Archive page instead of disappearing outright.
     */
    public function revokeReferral($id)
    {
        self::denyStudents();
        $referral = Referral::where('id', $id)->first();

        if (! $referral) {
            return response()->json(['message' => 'Referral not found.'], 404);
        }
        if (auth()->user()->role === 'sub_admin') {
            return response()->json(['message' => 'The prefect cannot revoke referrals.'], 403);
        }
        if ($referral->referrer_id !== auth()->id()) {
            return response()->json(['message' => 'You can only revoke a referral you filed yourself.'], 403);
        }

        if ($referral->referral_status !== 'pending' || $referral->confirmed_at !== null) {
            return response()->json(['message' => 'This referral can no longer be revoked.'], 400);
        }

        $oldStatus = $referral->referral_status;

        $referral->update([
            'referral_status' => 'revoked',
            'revoked_at' => now(),
            'archived_at' => archive_retention_date(),
        ]);

        ActionLog::log(
            auth()->id(),
            'referral',
            "Revoked their own referral (#{$referral->referral_number})",
            ['referral_status' => ['from' => $oldStatus, 'to' => 'revoked']]
        );

        return self::getAllReferral();
    }

    /**
     * Lets the referrer edit their own referral exactly once, and only
     * while it's still pending (before the prefect has approved/rejected
     * it).
     */
    public function updateReferral(UpdateReferralRequest $request, $id)
    {
        self::denyStudents();
        if ($blocked = self::outsideProgramResponse($request->referred_students ?? [])) {
            return $blocked;
        }
        $referral = Referral::where('id', $id)->first();

        if (! $referral) {
            return response()->json(['message' => 'Referral not found.'], 404);
        }
        if ($referral->referrer_id !== auth()->id()) {
            return response()->json(['message' => 'You can only edit a referral you filed yourself.'], 403);
        }
        if ($referral->referral_status !== 'pending' || $referral->confirmed_at !== null) {
            return response()->json(['message' => 'This referral can no longer be edited.'], 400);
        }
        if ($referral->editsLeft() <= 0) {
            return response()->json(['message' => 'You have already used all '.Referral::MAX_EDITS.' edits for this referral.'], 400);
        }

        DB::beginTransaction();
        try {
            // Snapshot the previous version before it's overwritten — this is
            // a log, not a destructive edit (matches Complaint's edit).
            $previousStudents = ReferralReferredStudent::where('referral_id', $id)
                ->with('user.profile')
                ->get()
                ->map(fn ($s) => [
                    'first_name' => $s->user?->profile?->first_name,
                    'middle_name' => $s->user?->profile?->middle_name,
                    'last_name' => $s->user?->profile?->last_name,
                ]);

            ReferralRevision::create([
                'referral_id' => $id,
                'reason_description' => $referral->reason_description,
                'students' => json_encode($previousStudents->values()),
                'created_at' => now(),
            ]);

            $oldReason = $referral->reason_description;

            $referral->update([
                'reason_description' => $request->referral_reason,
                'edited_at' => now(),
            ]);

            $newStudentIds = collect($request->referred_students)->map(fn ($s) => (int) $s);
            ReferralReferredStudent::where('referral_id', $id)
                ->whereNotIn('student_id', $newStudentIds)
                ->delete();
            $existingStudentIds = ReferralReferredStudent::where('referral_id', $id)->pluck('student_id');
            foreach ($newStudentIds->diff($existingStudentIds) as $studentId) {
                ReferralReferredStudent::insert(['referral_id' => $id, 'student_id' => $studentId]);
            }

            $changes = $oldReason !== $request->referral_reason
                ? ['reason_description' => ['from' => $oldReason, 'to' => $request->referral_reason]]
                : [];

            ActionLog::log(
                auth()->id(),
                'referral',
                "Edited their own referral (#{$referral->referral_number})",
                $changes
            );

            DB::commit();

            return self::getAllReferral();
        } catch (\Throwable $e) {
            DB::rollBack();

            return response()->json(['message' => 'Error updating referral', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Soft-rejects a pending referral with a reason — mirrors
     * ComplaintController::cancelComplaint()/AbsentFormController::cancelAbsentForm().
     * Named `destroy` to match the existing `/referral/verify/{id}/cancel`
     * route; it used to hard-delete the row (no reason recorded at all)
     * until this was fixed to keep it around like every other reject flow.
     */
    public function destroy(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:500']);

        $record = Referral::with(['user.profile', 'referredStudent.profile'])->where('id', $id)->first();

        if (! $record) {
            return response()->json(['message' => 'Referral not found.'], 404);
        }

        $oldStatus = $record->referral_status;

        $record->update([
            'referral_status' => 'rejected',
            'rejected_reason' => $request->reason,
            'rejected_at' => now(),
            'archived_at' => archive_retention_date(),
        ]);

        notify_single_user(
            self::getReferralNotifMessageResponseFields($record, 'reject')
        );

        ActionLog::log(
            auth()->user()->id,
            'referral',
            'Rejected the referral of '.$record->user?->profile?->first_name,
            ['referral_status' => ['from' => $oldStatus, 'to' => 'rejected']]
        );

        return self::getAllReferral();
    }

    /**
     * A referral that isn't really the prefect's to handle gets forwarded to
     * whichever office it actually belongs to — Guidance or IT Staff today.
     * Both destinations work identically: build the referral form from the
     * record (nothing is saved), email it to every non_teaching_staff user
     * holding that position, and open it for the prefect in the new tab.
     */
    public function printReferralGuidance($id)
    {
        return $this->sendReferralToPosition($id, 'Guidance');
    }

    public function printReferralToItStaff($id)
    {
        return $this->sendReferralToPosition($id, 'IT Staff');
    }

    private function sendReferralToPosition($id, string $positionName)
    {
        $id = decrypt_id($id) ?? abort(404);

        $referral = Referral::findOrFail($id);

        // A revoked referral can't be sent. A pending (or rejected) one is
        // approved first — sending it on is the prefect accepting it — so its
        // form is saved and the referrer is notified, as with Approve.
        if ($referral->revoked_at) {
            return response()->json(['message' => 'A revoked referral cannot be sent.'], 422);
        }
        if (! $referral->confirmed_at) {
            $this->approve($referral);
            $referral->refresh();
        }

        $referredStudents = ReferralReferredStudent::with(['referral', 'user.profile', 'user.program', 'user.enrollments'])
            ->where('referral_id', $id)
            ->get();

        $prefect = User::with('profile')->whereRole('sub_admin')->first();
        $prefectName = "{$prefect->profile?->first_name} {$prefect->profile?->middle_name} {$prefect->profile?->last_name}";

        // Where it went and when (the office's list, its access and the timeline).
        $referral->update([
            'sent_to' => $positionName,
            'sent_at' => now(),
            'send_to_guidance' => $positionName === 'Guidance' ? 1 : $referral->send_to_guidance,
        ]);

        // The referral form, built now from the record (not saved to storage).
        $pdf = $referral->fresh()->renderDocumentPdf()->output();
        $pdfName = "referral-form-{$referral->referral_number}.pdf";

        $studentNames = $referredStudents
            ->map(fn ($item) => trim("{$item->user->profile?->first_name} {$item->user->profile?->last_name}"))
            ->implode(', ');

        // Email to the target office with the referral form attached.
        // "Guidance"/"IT Staff" are non_teaching_staff positions, not roles.
        $recipients = User::whereHas('nonTeachingStaff', function ($q) use ($positionName) {
            $q->where('position_id', Position::idFor($positionName));
        })->with('profile')->get();
        foreach ($recipients as $recipient) {
            $mail = new ReferralMail([
                'referral_number' => $referral->referral_number,
                'prefect_name' => $prefectName,
                'student_names' => $studentNames,
                'date_issued' => Carbon::parse($referral->created_at)->format('F d, Y'),
                'office' => $positionName,
            ]);
            $mail->attachData($pdf, $pdfName, ['mime' => 'application/pdf']);
            Mail::to($recipient->email)->send($mail);
        }

        // The same form, opened in the tab (view / print).
        return response($pdf, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="'.$pdfName.'"',
        ]);
    }

    public function get($id)
    {
        self::denyStudents();
        $id = decrypt_id($id) ?? abort(404);

        $referral = Referral::with([
            'user.profile',
            'user.faculty.program', 'user.headships.program',
            'referredStudent.profile',
            'referredStudent.program',
            'referralReferredStudent.user.profile',
            'referralReferredStudent.user.program',
            'revisions',
            'officeNoteBy.profile',
        ])
            ->where('id', $id)
            ->first() ?? abort(404);
        abort_unless($referral->canView(auth()->user()), 403);

        return new ReferralResource($referral);
    }

    /**
     * The office a referral was sent to (Guidance / IT Staff) writes its note
     * on it — once: a saved note is final. Only that office; the note is
     * saved as sanitised rich text and also printed on the referral form.
     */
    public function saveOfficeNote(Request $request, $id)
    {
        $id = decrypt_id($id) ?? abort(404);
        $referral = Referral::findOrFail($id);
        abort_unless($referral->isSentToOfficeOf(auth()->user()), 403);
        // A note is final once saved: it can't be changed or replaced.
        if ($referral->office_note) {
            return response()->json(['message' => 'This referral already has a note. A saved note cannot be changed.'], 409);
        }

        $data = $request->validate(['note' => 'required|string|max:20000']);
        $note = clean_rich_text($data['note']);
        if (trim(strip_tags((string) $note)) === '') {
            return response()->json(['message' => 'The note is empty.', 'errors' => ['note' => ['Please write a note.']]], 422);
        }

        $referral->update([
            'office_note' => $note,
            'office_note_by' => auth()->id(),
            'office_note_at' => now(),
        ]);

        ActionLog::log(
            auth()->id(),
            'referral',
            'Wrote a note on referral #'.$referral->referral_number,
            ['office_note' => ['from' => null, 'to' => 'saved']]
        );

        return self::get(encrypt_id($referral->id));
    }

    public function getSendReferral()
    {
        return ReferralResource::collection(Referral::all());
    }

    private function isPrefect()
    {
        return auth()->user()->role == 'sub_admin';
    }

    private function getReferralNotifMessageReportFields($request, $prefect, $complaintId, $referral)
    {
        return [
            'notif_type' => 'referral',
            'sender_id' => $request->referrer_id,
            'receiver_id' => $prefect->id,
            'content' => json_encode([
                'id' => $complaintId,
                'sender_notif_message' => "You Have Reported A Referral Against {$referral->referredStudent->profile?->first_name}.",
                'receiver_notif_message' => "{$referral->user->profile?->first_name} Has Reported A Referral Against {$referral->referredStudent->profile?->first_name}.",
            ]),
            'read_since' => null,
        ];
    }

    private function getReferralNotifMessageResponseFields($referral, $type = 'confirm', $staff = null)
    {
        $content = '';

        if ($type == 'confirm') {
            $content = json_encode([
                'id' => $referral->id,
                'sender_notif_message' => "You Have Reported A Referral Against {$referral->referredStudent->profile?->first_name}.",
                'receiver_notif_message' => "Your Referral Against {$referral->referredStudent->profile?->first_name} Is Already Approved.",
            ]);
        }
        if ($type == 'send-guidance') {
            $content = json_encode([
                'id' => $referral->id,
                'sender_notif_message' => "You Have Reported A Referral Against {$referral->referredStudent->profile?->first_name}.",
                'receiver_notif_message' => "The Prefect Sends A Referral Referred By {$referral->user->profile?->first_name}.",
                'document' => "referral-no-{$referral->id}.pdf",
            ]);
        }
        if ($type == 'reject') {
            $content = json_encode([
                'id' => $referral->id,
                'sender_notif_message' => "You Have Reported A Referral Against {$referral->referredStudent->profile?->first_name}.",
                'receiver_notif_message' => "Your Referral Against {$referral->referredStudent->profile?->first_name} Has Been Rejected.",
            ]);
        }

        return [
            'notif_type' => 'referral',
            'sender_id' => auth()->user()->id,
            'receiver_id' => ($type != 'send-guidance') ? $referral->user->id : $staff,
            'content' => $content,
            'read_since' => null,
        ];
    }
}
