<?php

namespace App\Http\Controllers\Modules\GatePass;

use App\Events\GatePassApproved;
use App\Events\SendGatePass;
use App\Http\Controllers\Controller;
use App\Http\Requests\GatePass\ApproveGatePassRequest;
use App\Http\Requests\GatePass\GatepassRequestRequest;
use App\Http\Requests\GatePass\RejectGatePassRequest;
use App\Http\Requests\GatePass\UpdateGatePassRequest;
use App\Http\Resources\GatePassResource;
use App\Mail\GatePassMail;
use App\Models\ActionLog;
use App\Models\GatePass;
use App\Models\GatePassRevision;
use App\Models\SchoolYear;
use App\Models\SchoolYearSemester;
use App\Models\User;
use App\Traits\GeneratesSequenceCode;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class GatePassController extends Controller
{
    use GeneratesSequenceCode;

    public function index()
    {
        $isPrefect = self::isPrefect() ? 'prefect' : 'other';

        $gatepass = '';
        if (isset($_GET['status'])) {
            if ($_GET['status'] == 'all') {
                $gatepass = self::getAllGatePasses();
            } elseif ($_GET['status'] == 'confirmed-users') {
                $gatepass = self::getAllApprovedGatePass();
            } elseif ($_GET['status'] == 'expired-users') {
                $gatepass = self::getGatePassExpired();
            } elseif ($_GET['status'] == 'rejected-requests') {
                $gatepass = self::getAllRejectedGatePass();
            } elseif ($_GET['status'] == 'revoked-requests') {
                $gatepass = self::getAllRevokedGatePass();
            } else {
                $gatepass = self::getAllGatePassRequest();
            }
        } else {
            $gatepass = self::getAllGatePassRequest();
        }

        $user = auth()->user();
        $user->allow_gatepass = $user->permissions?->allow_gatepass;

        return Inertia::render("$isPrefect/gatepass", [
            'user' => $user,
            'program_name' => is_program_head(),
            'gatepass_request_list' => $gatepass,
            'user_gatepass' => self::getGatePass(auth()->user()->id),
            'school_years' => SchoolYear::orderByDesc('year')->pluck('year'),
        ]);
    }

    /**
     * Applies the school year/semester query-string filters shared by every
     * status tab on the prefect gatepass page — a GatePass builder or a
     * nested whereHas('gatepass', ...) closure both work here since either
     * way $query is scoped to the gate_pass table.
     */
    private static function filterBySchoolYearSemester($query)
    {
        if (request('school-year') && request('school-year') != 'all') {
            $query->whereHas('schoolYearSemester', function ($q) {
                $q->whereHas('schoolYear', fn ($sq) => $sq->where('year', request('school-year')));
            });
        }
        if (request('semester') && request('semester') != 'all') {
            $query->whereHas('schoolYearSemester', function ($q) {
                $q->where('semester', request('semester'));
            });
        }

        return $query;
    }

    public function qrcodeIndex()
    {
        $user = auth()->user();
        $isGuard = $user->role === 'non_teaching_staff'
            && $user->nonTeachingStaff?->position === 'Guard';
        $isAdmin = in_array($user->role, ['sub_admin', 'super_admin'], true);

        if (! $isGuard && ! $isAdmin) {
            return redirect('/dashboard');
        }

        return Inertia::render('staff/gatepass-verification', [
            'user' => $user,
            'program_name' => null,
            'gatepass_approved_list' => self::getAllGatePass()->get(),
        ]);
    }

    public function prefectIndex()
    {
        return Inertia::render('prefect/gatepass', [
            'user' => auth()->user(),
        ]);
    }

    public function gatePassApproveUserIndex()
    {
        return Inertia::render('staff/gatepass-approval', [
            'user' => auth()->user(),

            'gatepass_approved_list' => self::getAllGatePass()->get(),
        ]);
    }

    public function gatepassRequest(GatepassRequestRequest $request)
    {
        $senderName = auth()->user()->profile?->first_name.' '.auth()->user()->profile?->last_name;
        $prefectId = User::where('role', 'sub_admin')->first()?->id;
        $webpushNotif = [
            'title' => 'Gate Pass Request',
            'body' => "$senderName Has Requested a Gate Pass.",
            'icon' => '',
            'url' => url('/prefect/gatepass'),
        ];
        DB::beginTransaction();
        try {

            $lastIndex = GatePass::insertGetId([
                'gatepass_number' => $this->generateSequenceCode(GatePass::class, 'gatepass_number'),
                'user_id' => auth()->user()->id,
                'reason' => $request->other_reason,
                'school_year_semester_id' => SchoolYearSemester::currentId(),
            ]);
            notify_single_user(
                self::getGatePassRequestNotif($lastIndex, $prefectId),
                $webpushNotif,
                new SendGatePass($prefectId)
            );
            ActionLog::create([
                'user_id' => auth()->user()->id,
                'action_type' => 'gatepass',
                'details' => 'requests a gatepass to the prefect',
            ]);
            DB::commit();

            return response()->json(['message' => 'success']);
        } catch (Exception $x) {
            DB::rollBack();

            return response()->json(['message' => $x->getMessage()], 400);
        }
    }

    public function approveGatePassRequest($id, ApproveGatePassRequest $request)
    {
        $gatepass = GatePass::with(['user.profile', 'user.program', 'user.enrollments'])->where('id', $id);
        $expDate = request('expiration_date');

        DB::beginTransaction();
        try {
            $gatepass->update([
                'confirmed_at' => now(),
                'allow_to' => json_encode(request('allow_to')),
                'date_expiration' => $expDate,
                'confirmed_school_year_semester_id' => SchoolYearSemester::currentId(),
            ]);
            $prefect = auth()->user()->profile?->first_name.' '.auth()->user()->profile?->last_name;
            $gatepass = $gatepass->first();

            $data = [
                'requester' => $gatepass->user->profile?->first_name,
                'status' => 'approve',
                'date_requested' => $gatepass->created_at,
                'date_time_expiration' => $gatepass->date_expiration,
                'prefect_name' => $prefect,
            ];
            $dataNotif = [
                'id' => $gatepass->id,
                'first_name' => $gatepass->user->profile?->first_name,
                'last_name' => $gatepass->user->profile?->last_name,
                'profile_picture' => $gatepass->user->profile?->profile_picture,
                'user_type' => $gatepass->user->role,
                'name' => $gatepass->user->program?->name,
                'reason' => $gatepass->reason,
                'allow_to' => json_encode(request('allow_to')),
                'confirmed_at' => $gatepass->confirmed_at,
                'date_expiration' => $gatepass->date_expiration,
                'created_at' => $gatepass->created_at,
            ];

            $webpushNotif = [
                'title' => 'Gate Pass Request',
                'body' => 'Your Gate Pass Has Been Approved.',
                'icon' => '',
                'url' => url('/prefect/gatepass'),
            ];
            $gatepass = $gatepass->first();

            notify_single_user(
                self::getGatePassResponseNotif($gatepass->user_id, $dataNotif),
                $webpushNotif,
                new SendGatePass($gatepass->user_id)
            );
            ActionLog::log(
                auth()->user()->id,
                'gatepass',
                'Approved the gatepass request of '.$gatepass->user->profile?->first_name,
                ['status' => ['from' => 'pending', 'to' => 'approved']]
            );
            Mail::to($gatepass->user->email)
                ->send(new GatePassMail($data));
            DB::commit();

            // Tells every Guard's verification page to refresh its approved
            // list in real time (see gatepass-verification.jsx) — fired
            // after commit so it never announces a change that got rolled back.
            event(new GatePassApproved);

            return response()->json(self::getAllGatePassRequest()->toArray());

        } catch (Exception $x) {
            DB::rollBack();

            return response()->json(['message' => $x->getMessage()], 400);
        }

    }

    // Soft reject — the row stays (unlike the old behavior, which hard-
    // deleted the request with no reason recorded at all), mirroring
    // ComplaintController::cancelComplaint()'s reject-with-reason pattern.
    public function disapproveGatePassRequest(RejectGatePassRequest $request, $id)
    {
        DB::beginTransaction();
        try {
            $gatepass = GatePass::with('user.profile')->where('id', $id);
            ActionLog::log(
                auth()->user()->id,
                'gatepass',
                'Rejected the gatepass request of '.$gatepass->first()->user->profile?->first_name,
                ['status' => ['from' => 'pending', 'to' => 'rejected']]
            );
            $gatepass->update([
                'rejected_reason' => $request->reason,
                'rejected_at' => now(),
                'archived_at' => archive_retention_date(),
                'rejected_school_year_semester_id' => SchoolYearSemester::currentId(),
            ]);
            DB::commit();

            return response()->json(self::getAllGatePassRequest()->toArray());
        } catch (Exception $x) {
            DB::rollBack();

            return response()->json(['message' => $x], 400);
        }
    }

    /**
     * Lets the requester withdraw their own pending gate pass. Soft delete,
     * not a hard delete — mirrors ComplaintController::revokeComplaint().
     */
    public function revokeGatePass($id)
    {
        $gatepass = GatePass::with('user.profile')->where('id', $id)->first();

        if (! $gatepass) {
            return response()->json(['message' => 'Gate pass not found.'], 404);
        }
        if ($gatepass->user_id !== auth()->id()) {
            return response()->json(['message' => 'You can only revoke a gate pass you requested yourself.'], 403);
        }
        if ($gatepass->confirmed_at !== null || $gatepass->rejected_at !== null || $gatepass->revoked_at !== null) {
            return response()->json(['message' => 'This gate pass can no longer be revoked.'], 400);
        }

        $gatepass->update([
            'revoked_at' => now(),
            'archived_at' => archive_retention_date(),
            'revoked_school_year_semester_id' => SchoolYearSemester::currentId(),
        ]);

        ActionLog::log(
            auth()->id(),
            'gatepass',
            'Revoked their own gatepass request',
            ['status' => ['from' => 'pending', 'to' => 'revoked']]
        );

        return response()->json(self::getGatePass(auth()->id()));
    }

    /**
     * One-time edit of the requester's own pending gate pass reason —
     * mirrors ComplaintController::updateComplaint()'s snapshot-before-
     * overwrite pattern (a log, not a destructive edit).
     */
    public function updateGatePass(UpdateGatePassRequest $request, $id)
    {
        DB::beginTransaction();
        try {
            $gatepass = GatePass::where('id', $id)->first();

            if (! $gatepass) {
                return response()->json(['message' => 'Gate pass not found.'], 404);
            }
            if ($gatepass->user_id !== auth()->id()) {
                return response()->json(['message' => 'You can only edit a gate pass you requested yourself.'], 403);
            }
            if ($gatepass->confirmed_at !== null || $gatepass->rejected_at !== null || $gatepass->revoked_at !== null) {
                return response()->json(['message' => 'This gate pass can no longer be edited.'], 400);
            }
            if ($gatepass->edited_at !== null) {
                return response()->json(['message' => 'You have already used your one edit for this gate pass.'], 400);
            }

            GatePassRevision::create([
                'gate_pass_id' => $id,
                'reason' => $gatepass->reason,
                'created_at' => now(),
            ]);

            $oldReason = $gatepass->reason;

            $gatepass->update([
                'reason' => $request->reason,
                'edited_at' => now(),
            ]);

            $changes = $oldReason !== $request->reason
                ? ['reason' => ['from' => $oldReason, 'to' => $request->reason]]
                : [];

            ActionLog::log(
                auth()->id(),
                'gatepass',
                'Edited their own gatepass request',
                $changes
            );

            DB::commit();

            return response()->json(self::getGatePass(auth()->id()));
        } catch (Exception $x) {
            DB::rollBack();

            return response()->json(['message' => $x->getMessage()], 400);
        }
    }

    public function get($id)
    {
        $data = GatePass::with(['user' => function ($q) {
            $q->with(['profile', 'program']);
        }])
            ->where('id', $id)
            ->get();

        return GatePassResource::collection($data);
    }

    public function getAllApprovedGatePass()
    {
        return self::getAllGatePass()->get();
    }

    public function getGatePass($id)
    {
        return User::with(['gatepass' => function ($query) {
            $query->latest('created_at');
        }])
            ->where('id', $id)
            ->first();
    }

    private function isPrefect()
    {
        return auth()->user()->role == 'sub_admin';
    }

    public function getAllGatePassRequest()
    {
        $query = GatePass::with(['user.profile', 'user.program', 'user.enrollments'])
            ->where('confirmed_at', null)
            ->whereNull('archived_at')
            ->latest('created_at');

        return GatePassResource::collection(self::filterBySchoolYearSemester($query)->get());
    }

    /**
     * The "All" tab — every non-archived gate pass regardless of status.
     * Uses the same GatePass-row shape as pending/rejected/revoked (not the
     * user-keyed shape confirmed-users/expired-users use), since
     * GatePassRequestList already derives a per-row status badge
     * (pending/approved/rejected/revoked) from the timestamps itself.
     */
    public function getAllGatePasses()
    {
        $query = GatePass::with(['user.profile', 'user.program', 'user.enrollments'])
            ->whereNull('archived_at')
            ->latest('created_at');

        return GatePassResource::collection(self::filterBySchoolYearSemester($query)->get());
    }

    /**
     * Every gate pass a user has ever requested — surfaced as the "Gatepass
     * Requested" tab on their own profile, mirroring
     * ComplaintController::getComplainantComplaint().
     */
    public function getUserGatePassRequests($id)
    {
        return GatePassResource::collection(GatePass::with(['user.profile', 'user.program', 'user.enrollments', 'schoolYearSemester.schoolYear'])
            ->where('user_id', $id)
            ->latest('created_at')
            ->get());
    }

    public function getAllRejectedGatePass()
    {
        $query = GatePass::with(['user.profile', 'user.program', 'user.enrollments'])
            ->whereNotNull('rejected_at')
            ->latest('rejected_at');

        return GatePassResource::collection(self::filterBySchoolYearSemester($query)->get());
    }

    public function getAllRevokedGatePass()
    {
        $query = GatePass::with(['user.profile', 'user.program', 'user.enrollments'])
            ->whereNotNull('revoked_at')
            ->latest('revoked_at');

        return GatePassResource::collection(self::filterBySchoolYearSemester($query)->get());
    }

    public function getAllGatePass()
    {

        return User::with(['profile', 'program', 'enrollments'])
            ->whereHas('gatepass', function ($q) {
                $q->whereNotNull('confirmed_at')
                    ->whereNull('archived_at')
                    ->where('date_expiration', '>=', now());
                self::filterBySchoolYearSemester($q);
            })
            ->with(['gatepass' => function ($q) {
                $q->whereNotNull('confirmed_at')
                    ->whereNull('archived_at')
                    ->where('date_expiration', '>=', now())
                    ->latest()
                    ->limit(1);
                self::filterBySchoolYearSemester($q);
            }])
            ->orderByDesc(
                GatePass::select('confirmed_at')
                    ->whereColumn('gate_pass.user_id', 'users.id')
                    ->whereNotNull('confirmed_at')
                    ->whereNull('archived_at')
                    ->where('date_expiration', '>=', now())
                    ->latest()
                    ->limit(1)
            );
    }

    public function getGatePassExpired()
    {
        return User::with(['profile', 'program', 'enrollments'])
            ->whereHas('gatepass', function ($q) {
                $q->whereNotNull('confirmed_at')
                    ->whereNull('archived_at')
                    ->where('date_expiration', '<=', now());
                self::filterBySchoolYearSemester($q);
            })
            ->with(['gatepass' => function ($q) {
                $q->whereNotNull('confirmed_at')
                    ->whereNull('archived_at')
                    ->where('date_expiration', '<=', now())
                    ->latest()
                    ->limit(1);
                self::filterBySchoolYearSemester($q);
            }])
            ->orderByDesc(
                GatePass::select('confirmed_at')
                    ->whereColumn('gate_pass.user_id', 'users.id')
                    ->whereNotNull('confirmed_at')
                    ->whereNull('archived_at')
                    ->where('date_expiration', '<=', now())
                    ->latest()
                    ->limit(1)
            )
            ->get();
    }

    public function getGatePassRequestNotif($id, $receiver)
    {
        $user = auth()->user();

        // Build consistent notification payload for getContent()
        $data = [
            'sender_message' => 'You have requested a gate pass.',
            'receiver_message' => $user->profile?->first_name.' '.$user->profile?->last_name.' has requested a gate pass.',
            'id' => $id,
            // User info
            'first_name' => $user->profile?->first_name,
            'last_name' => $user->profile?->last_name,
            'profile_picture' => $user->profile?->profile_picture,
            'user_type' => $user->role,
            'name' => $user->program?->name ?? null,

            // Gatepass info (only reason is known at request stage)
            'reason' => request('other_reason') ?? null,
            'allow_to' => null,
            'confirmed_at' => null,
            'date_expiration' => null,
            'created_at' => now(),
        ];

        return [
            'notif_type' => 'gatepass',
            'sender_id' => $user->id,
            'receiver_id' => $receiver,
            'content' => $this->getContent($data),  // ⬅️ FIXED
            'read_since' => null,
        ];

    }

    public function getGatePassResponseNotif($receiver, $data)
    {
        $dataNotif = [
            'sender_message' => 'Your gatepass request has been approved.',
            'receiver_message' => 'Your gatepass request has been approved.',
            'id' => $data['id'],
            'first_name' => $data['first_name'],
            'last_name' => $data['last_name'],
            'profile_picture' => $data['profile_picture'],
            'user_type' => $data['user_type'],
            'name' => $data['name'],
            'reason' => $data['reason'],
            'allow_to' => request('allow_to'),
            'confirmed_at' => $data['confirmed_at'],
            'date_expiration' => $data['date_expiration'],
            'created_at' => $data['created_at'],
        ];

        return [
            'notif_type' => 'gatepass',
            'sender_id' => auth()->user()->id,
            'receiver_id' => $receiver,
            'content' => $this->getContent($dataNotif),
            'read_since' => null,
        ];
    }

    public function getContent($data)
    {
        return json_encode([
            'sender_notif_message' => $data['sender_message'],
            'receiver_notif_message' => $data['receiver_message'],
            'gatepass' => [
                'id' => $data['id'] ?? null,
                'user' => [
                    'first_name' => $data['first_name'] ?? null,
                    'last_name' => $data['last_name'] ?? null,
                    'profile_picture' => $data['profile_picture'] ?? null,
                    'user_type' => $data['user_type'] ?? null,
                    'student' => [
                        'program' => [
                            'name' => $data['name'] ?? null,
                        ],
                    ],
                ],
                'reason' => $data['reason'] ?? null,
                'allow_to' => $data['allow_to'] ?? null,
                'confirmed_at' => $data['confirmed_at'] ?? null,
                'date_expiration' => $data['date_expiration'] ?? null,
                'created_at' => $data['created_at'] ?? now(),
            ],
        ]);
    }
}
