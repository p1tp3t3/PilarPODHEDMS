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
                    'message' => "You need prefect-approved \"$accessType\" access to $resource management to do this. Request access from the Access Requests tab.",
                ], 403);
            }

            // Single-use: consumed the instant it's let through, even if the
            // controller action itself later fails — the grant existing at
            // all still means the one-time use it that this middleware
            // exists to gate has already happened.
            $grant->update(['status' => 'used', 'used_at' => now()]);
        }

        return $next($request);
    }
}
