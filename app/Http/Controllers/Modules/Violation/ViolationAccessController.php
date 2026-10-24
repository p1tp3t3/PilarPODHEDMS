<?php

namespace App\Http\Controllers\Modules\Violation;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ViolationAccessRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The prefect (sub_admin) owns the violation/penalty catalog. The super
 * admin can only change it while holding access the prefect GAVE them
 * directly (grant()) — scoped per resource + action, time-limited, and
 * revocable by the prefect at any time. Enforced by EnsureViolationEditAccess.
 *
 * Grants reuse the violation_access_requests table (status 'approved' with
 * an expires_at), so older request-based rows stay in the history.
 */
class ViolationAccessController extends Controller
{
    /** How long a grant may last (minutes) — what the prefect can choose from. */
    public const DURATIONS = [30, 60, 240, 480, 1440, 4320, 10080];

    /** How many times a grant may be used (null = unlimited until it expires). */
    public const USE_LIMITS = [1, 3, 5, 10];

    /**
     * The prefect gives a super admin access to one or more actions.
     * Any still-active grant for the same admin + action is replaced.
     */
    public function grant(Request $request)
    {
        if (auth()->user()->role !== 'sub_admin') {
            return response()->json(['message' => 'Only a prefect can give violation/penalty access.'], 403);
        }

        $data = $request->validate([
            'permissions' => 'required|array|min:1',
            'permissions.*.resource' => 'required|in:'.implode(',', ViolationAccessRequest::RESOURCES),
            'permissions.*.access_type' => 'required|in:'.implode(',', ViolationAccessRequest::ACCESS_TYPES),
            'duration_minutes' => 'required|integer|in:'.implode(',', self::DURATIONS),
            'max_uses' => 'nullable|integer|in:'.implode(',', self::USE_LIMITS),
            'note' => 'nullable|string|max:5000', // rich text (HTML); the page limits the visible text to 1000
        ]);

        // Access goes to the IT admin — every super admin account, so none is left out.
        $admins = User::whereRole('super_admin')->get();
        if ($admins->isEmpty()) {
            return response()->json(['message' => "There's no IT admin account to give access to."], 422);
        }

        $permissions = collect($data['permissions'])->unique(fn ($p) => $p['resource'].'.'.$p['access_type'])->values();
        foreach ($permissions as $p) {
            if (! in_array($p['access_type'], ViolationAccessRequest::VALID_COMBINATIONS[$p['resource']], true)) {
                return response()->json(['message' => 'There is no "'.$p['access_type'].'" action for '.$p['resource'].' management.'], 422);
            }
        }

        $expiresAt = now()->addMinutes($data['duration_minutes']);
        foreach ($admins as $admin) {
        foreach ($permissions as $p) {
            // Replace an existing active grant for the same action.
            ViolationAccessRequest::where('user_id', $admin->id)
                ->where('resource', $p['resource'])->where('access_type', $p['access_type'])
                ->where('status', 'approved')->where('expires_at', '>', now())
                ->update(['status' => 'revoked', 'revoked_at' => now(), 'responded_by' => auth()->id()]);

            ViolationAccessRequest::create([
                'user_id' => $admin->id,
                'resource' => $p['resource'],
                'access_type' => $p['access_type'],
                'reason' => $data['note'] ?? null,
                'status' => 'approved',
                'responded_by' => auth()->id(),
                'responded_at' => now(),
                'approved_at' => now(),
                'expires_at' => $expiresAt,
                'max_uses' => $data['max_uses'] ?? null,
                'uses_count' => 0,
            ]);
        }
        }

        $times = isset($data['max_uses']) ? ' — '.$data['max_uses'].' '.($data['max_uses'] == 1 ? 'time' : 'times').' each' : '';
        $list = $permissions->map(fn ($p) => ucfirst($p['access_type']).' '.$p['resource'].'s')->implode(', ');
        $until = $expiresAt->format('M j, Y g:i A');
        foreach ($admins as $admin) {
            notify_single_user([
                'notif_type' => 'violation_access',
                'sender_id' => auth()->id(),
                'receiver_id' => $admin->id,
                'content' => json_encode([
                    'sender_notif_message' => "Gave access: $list (until $until$times).",
                    'receiver_notif_message' => "The prefect gave you access: $list (until $until$times).",
                ]),
                'read_since' => null,
            ]);
        }

        return response()->json(['message' => 'Access given.']);
    }

    /** Retired: the prefect now gives access directly (see grant()). */
    public function request(Request $request)
    {
        return response()->json(['message' => 'Access is now given by the prefect directly, so there is nothing to request.'], 410);
    }

    // The old request flow, kept for reference only (no route calls it).
    private function legacyRequest(Request $request)
    {
        if (auth()->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Only super admin accounts request violation edit access.'], 403);
        }

        $data = $request->validate([
            'resource' => 'required|in:'.implode(',', ViolationAccessRequest::RESOURCES),
            'access_type' => 'required|in:'.implode(',', ViolationAccessRequest::ACCESS_TYPES),
            'reason' => 'required|string|max:1000',
        ]);

        if (! in_array($data['access_type'], ViolationAccessRequest::VALID_COMBINATIONS[$data['resource']], true)) {
            return response()->json(['message' => "There's no \"{$data['access_type']}\" action for {$data['resource']} management."], 422);
        }

        if (ViolationAccessRequest::hasActiveAccess(auth()->id(), $data['resource'], $data['access_type'])) {
            return response()->json(['message' => "You already have active \"{$data['access_type']}\" access to {$data['resource']} management."], 400);
        }
        if (ViolationAccessRequest::hasPendingRequest(auth()->id(), $data['resource'], $data['access_type'])) {
            return response()->json(['message' => "You already have a pending \"{$data['access_type']}\" request for {$data['resource']} management."], 400);
        }

        $accessRequest = ViolationAccessRequest::create([
            'user_id' => auth()->id(),
            'resource' => $data['resource'],
            'access_type' => $data['access_type'],
            'reason' => $data['reason'],
            'status' => 'pending',
        ]);

        $label = "\"{$data['access_type']}\" access to ".ucfirst($data['resource']).' Management';

        foreach (User::whereRole('sub_admin')->get() as $prefect) {
            notify_single_user([
                'notif_type' => 'violation_access',
                'sender_id' => auth()->id(),
                'receiver_id' => $prefect->id,
                'content' => json_encode([
                    'sender_notif_message' => "Requested $label.",
                    'receiver_notif_message' => auth()->user()->username." is requesting $label.",
                ]),
                'read_since' => null,
            ]);
        }

        return response()->json(['message' => 'Access request sent to the prefect.', 'request' => $accessRequest]);
    }

    /**
     * Every request the requesting super admin has made — one row per
     * resource/access_type combination, since grants are scoped per action
     * and several can be active/pending at once.
     */
    public function status()
    {
        $requests = ViolationAccessRequest::allFor(auth()->id());

        $hasAccess = [];
        foreach (ViolationAccessRequest::VALID_COMBINATIONS as $resource => $types) {
            foreach ($types as $type) {
                $hasAccess[$resource][$type] = ViolationAccessRequest::hasActiveAccess(auth()->id(), $resource, $type);
            }
        }

        return response()->json([
            'requests' => $requests,
            'has_access' => $hasAccess,
        ]);
    }

    /**
     * Prefect-facing roster of every request (any status), newest first.
     */
    public function index()
    {
        if (auth()->user()->role !== 'sub_admin') {
            return response()->json(['message' => 'Only a prefect can view access requests.'], 403);
        }

        return response()->json([
            'grants' => ViolationAccessRequest::with(['requester.profile', 'responder.profile'])
                ->latest('id')
                ->get(),
            'admins' => User::with('profile')->whereRole('super_admin')->get()
                ->map(fn ($u) => [
                    'id' => $u->id,
                    'name' => trim(($u->profile?->first_name ?? '').' '.($u->profile?->last_name ?? '')) ?: 'IT Admin',
                ])->values(),
            'durations' => self::DURATIONS,
            'use_limits' => self::USE_LIMITS,
        ]);
    }

    public function approve($id)
    {
        $accessRequest = self::authorizedPendingRequest($id);
        if ($accessRequest instanceof JsonResponse) {
            return $accessRequest;
        }

        $accessRequest->update([
            'status' => 'approved',
            'responded_by' => auth()->id(),
            'responded_at' => now(),
            'approved_at' => now(),
            'expires_at' => now()->addMinutes(ViolationAccessRequest::ACCESS_DURATION_MINUTES),
        ]);

        self::notifyRequester($accessRequest, 'Your "'.$accessRequest->access_type.'" request for '.ucfirst($accessRequest->resource).' Management was approved for '.ViolationAccessRequest::ACCESS_DURATION_MINUTES.' minutes.');

        return response()->json(['message' => 'Access request approved.']);
    }

    public function deny(Request $request, $id)
    {
        $accessRequest = self::authorizedPendingRequest($id);
        if ($accessRequest instanceof JsonResponse) {
            return $accessRequest;
        }

        $data = $request->validate([
            'response_reason' => 'required|string|max:1000',
        ]);

        $accessRequest->update([
            'status' => 'denied',
            'response_reason' => $data['response_reason'],
            'responded_by' => auth()->id(),
            'responded_at' => now(),
            'denied_at' => now(),
        ]);

        self::notifyRequester($accessRequest, 'Your "'.$accessRequest->access_type.'" request for '.ucfirst($accessRequest->resource).' Management was denied: '.$data['response_reason']);

        return response()->json(['message' => 'Access request denied.']);
    }

    /**
     * A request is never hard-deleted — only its status changes, so the
     * history stays intact. Only the requester revokes, and only while
     * there's still something to give up: after sending (pending) or once
     * granted (approved). The prefect has no revoke action at all — their
     * only say is approve/deny up front — and a denied request has nothing
     * left to revoke.
     */
    public function revoke($id)
    {
        $user = auth()->user();

        // The prefect can take back any grant; a super admin can give up their own.
        $query = ViolationAccessRequest::where('id', $id)->whereIn('status', ['pending', 'approved']);
        if ($user->role === 'super_admin') {
            $query->where('user_id', $user->id);
        } elseif ($user->role !== 'sub_admin') {
            return response()->json(['message' => 'Not allowed.'], 403);
        }
        $accessRequest = $query->first();

        if (! $accessRequest) {
            return response()->json(['message' => 'No active access was found to revoke.'], 404);
        }

        $accessRequest->update([
            'status' => 'revoked',
            'responded_by' => auth()->id(),
            'responded_at' => now(),
            'revoked_at' => now(),
        ]);

        if ($user->role === 'sub_admin') {
            self::notifyRequester($accessRequest, 'The prefect removed your "'.$accessRequest->access_type.'" access to '.ucfirst($accessRequest->resource).' Management.');
        }

        return response()->json(['message' => 'Access revoked.']);
    }

    private static function authorizedPendingRequest($id)
    {
        if (auth()->user()->role !== 'sub_admin') {
            return response()->json(['message' => 'Only a prefect can act on access requests.'], 403);
        }

        $accessRequest = ViolationAccessRequest::where('id', $id)->where('status', 'pending')->first();
        if (! $accessRequest) {
            return response()->json(['message' => 'This request is no longer pending.'], 404);
        }

        return $accessRequest;
    }

    private static function notifyRequester(ViolationAccessRequest $accessRequest, string $message): void
    {
        notify_single_user([
            'notif_type' => 'violation_access',
            'sender_id' => auth()->id(),
            'receiver_id' => $accessRequest->user_id,
            'content' => json_encode([
                'sender_notif_message' => $message,
                'receiver_notif_message' => $message,
            ]),
            'read_since' => null,
        ]);
    }
}
