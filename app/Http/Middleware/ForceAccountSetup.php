<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Inertia\Inertia;

class ForceAccountSetup
{
    /**
     * Handle an incoming request.
     *
     * Gates every route behind account setup completion while the session
     * was flagged for it at login (set in
     * AuthenticatedSessionController::startSession) — a separate concern
     * from the 'auth'/'activate' guards, driven purely by the session flag
     * rather than re-checking the DB flags on every request.
     *
     * Three steps, in order: verify email (Laravel's built-in signed-link
     * verification) → complete profile → set password. Profile completion
     * and the password change are submitted together as one atomic step
     * (AccountSetupController::complete) — both the profile and password
     * steps are rendered by the same page at /force-change/{username} (the
     * password step is a local, in-page view change after the profile step,
     * not a separate route), but every other route stays blocked until
     * that combined submission succeeds and clears the session flag.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (!auth()->check() || !session('force_account_setup')) {
            return $next($request);
        }

        $user = auth()->user();
        $path = '/' . ltrim($request->path(), '/');

        if (!$user->hasVerifiedEmail()) {
            $emailStepAllowed = [
                '/verify-email',
                '/email/verification-notification',
                '/log-out',
            ];

            foreach ($emailStepAllowed as $prefix) {
                if (str_starts_with($path, $prefix)) {
                    return $next($request);
                }
            }

            return Inertia::location('/verify-email');
        }

        $allowed = [
            "/force-change/{$user->username}",
            '/account-setup/complete',
            '/api/password/verify',
            '/log-out',
        ];

        foreach ($allowed as $prefix) {
            if (str_starts_with($path, $prefix)) {
                return $next($request);
            }
        }

        return Inertia::location("/force-change/{$user->username}");
    }
}
