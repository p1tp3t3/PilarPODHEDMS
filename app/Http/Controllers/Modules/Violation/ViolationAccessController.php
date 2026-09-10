<?php

namespace App\Http\Controllers\Modules\Violation;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\ViolationAccessRequest;
use Illuminate\Http\Request;

/**
 * Super admin manages the violation/penalty catalog but isn't trusted to
 * edit it unsupervised — a prefect (sub_admin) has to grant time-limited
 * edit access first. See MaintenanceController's ensureViolationEditAccess()
 * for where that grant is actually enforced.
 */
class ViolationAccessController extends Controller
{
    public function request(Request $request)
    {
        if (auth()->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Only super admin accounts request violation edit access.'], 403);
        }

        $data = $request->validate([
            'resource' => 'required|in:' . implode(',', ViolationAccessRequest::RESOURCES),
            'access_type' => 'required|in:' . implode(',', ViolationAccessRequest::ACCESS_TYPES),
            'reason' => 'required|string|max:1000',
        ]);

        if (!in_array($data['access_type'], ViolationAccessRequest::VALID_COMBINATIONS[$data['resource']], true)) {
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

        $label = "\"{$data['access_type']}\" access to " . ucfirst($data['resource']) . ' Management';

        foreach (User::where('role', 'sub_admin')->get() as $prefect) {
            notify_single_user([
                'notif_type' => 'violation_access',
                'sender_id' => auth()->id(),
                'receiver_id' => $prefect->id,
                'content' => json_encode([
                    'sender_notif_message' => "Requested $label.",
                    'receiver_notif_message' => auth()->user()->username . " is requesting $label.",
                ]),
                'read_since' => null,
            ], [
                'title' => 'Violation Access Request',
                'body' => auth()->user()->username . " is requesting $label.",
                'url' => '',
                'icon' => '',
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

        return response()->json(
            ViolationAccessRequest::with(['requester.profile', 'responder.profile'])
                ->latest('id')
                ->get()
        );
    }

    public function approve($id)
    {
        $accessRequest = self::authorizedPendingRequest($id);
        if ($accessRequest instanceof \Illuminate\Http\JsonResponse) {
            return $accessRequest;
        }

        $accessRequest->update([
            'status' => 'approved',
            'responded_by' => auth()->id(),
            'responded_at' => now(),
            'approved_at' => now(),
            'expires_at' => now()->addMinutes(ViolationAccessRequest::ACCESS_DURATION_MINUTES),
        ]);

        self::notifyRequester($accessRequest, 'Your "' . $accessRequest->access_type . '" request for ' . ucfirst($accessRequest->resource) . ' Management was approved for ' . ViolationAccessRequest::ACCESS_DURATION_MINUTES . ' minutes.');

        return response()->json(['message' => 'Access request approved.']);
    }

    public function deny(Request $request, $id)
    {
        $accessRequest = self::authorizedPendingRequest($id);
        if ($accessRequest instanceof \Illuminate\Http\JsonResponse) {
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

        self::notifyRequester($accessRequest, 'Your "' . $accessRequest->access_type . '" request for ' . ucfirst($accessRequest->resource) . ' Management was denied: ' . $data['response_reason']);

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

        $accessRequest = ViolationAccessRequest::where('id', $id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['pending', 'approved'])
            ->first();

        if ($user->role !== 'super_admin' || !$accessRequest) {
            return response()->json(['message' => 'No pending or active request of yours was found to revoke.'], 404);
        }

        $accessRequest->update([
            'status' => 'revoked',
            'responded_by' => auth()->id(),
            'responded_at' => now(),
            'revoked_at' => now(),
        ]);

        return response()->json(['message' => 'Request withdrawn.']);
    }

    private static function authorizedPendingRequest($id)
    {
        if (auth()->user()->role !== 'sub_admin') {
            return response()->json(['message' => 'Only a prefect can act on access requests.'], 403);
        }

        $accessRequest = ViolationAccessRequest::where('id', $id)->where('status', 'pending')->first();
        if (!$accessRequest) {
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
        ], [
            'title' => 'Violation Access Request',
            'body' => $message,
            'url' => '',
            'icon' => '',
        ]);
    }
}
