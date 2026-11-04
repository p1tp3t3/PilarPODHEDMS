<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenanceMode
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! Cache::get('maintenance_mode', false)) {
            return $next($request);
        }

        if (auth()->check() && auth()->user()->role === 'super_admin') {
            return $next($request);
        }

        if ($request->routeIs('super-admin.maintenance-login', 'super-admin.maintenance-login.attempt')) {
            return $next($request);
        }

        if ($request->expectsJson()) {
            return response()->json([
                'message' => 'The site is currently under maintenance.',
            ], 503);
        }

        return Inertia::render('guest/maintenance-notice')->toResponse($request);
    }
}
