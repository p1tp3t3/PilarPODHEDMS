<?php

namespace App\Http\Middleware;

use App\Models\ViolationAccessRequest;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sub_admin (prefect) owns violation/penalty data outright. Super admin
 * only gets to actually change it while holding a live, prefect-approved
 * ViolationAccessRequest (see ViolationAccessController) scoped to the
 * specific resource + action the route performs — every other role
 * reaching these routes is unaffected.
 *
 * Usage: ->middleware('violation-edit-authorized:violation,add')
 */
class EnsureViolationEditAccess
{
    public function handle(Request $request, Closure $next, string $resource, string $accessType): Response
    {
        if (auth()->user()->role === 'super_admin') {
            $grant = ViolationAccessRequest::activeGrant(auth()->id(), $resource, $accessType);

            if (!$grant) {
                return response()->json([
                    'message' => "You don't have \"$accessType\" access to $resource management right now. The prefect can give it to you.",
                ], 403);
            }

            $response = $next($request);

            // Only a change that actually went through uses up an attempt
            // (a failed validation doesn't). When a limited grant runs out of
            // uses it ends, even if its time hasn't.
            if ($response->isSuccessful()) {
                $grant->increment('uses_count');
                $grant->refresh();
                $grant->update([
                    'used_at' => now(),
                    'status' => ($grant->max_uses !== null && $grant->uses_count >= $grant->max_uses) ? 'used' : 'approved',
                ]);
            }

            return $response;
        }

        return $next($request);
    }
}
