<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\HttpFoundation\Response;

/**
 * CheckMaintenanceMode already locks out everyone except the super admin
 * while maintenance mode is on — but that super admin could otherwise still
 * make ordinary data changes anywhere else in the app during the window.
 * This blocks every write except the maintenance controls themselves
 * (toggling mode off, sending the notice, backups) and the maintenance-mode
 * backdoor login, so the system is genuinely read-only while it's "down".
 */
class PreventWritesDuringMaintenance
{
    private const ALLOWED_WRITE_PATHS = [
        'maintenance/mode/toggle',
        'maintenance/notify',
        'maintenance/backups/*',
        'super-admin/login/*',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        if (! Cache::get('maintenance_mode', false)) {
            return $next($request);
        }

        if (in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return $next($request);
        }

        if ($request->is(...self::ALLOWED_WRITE_PATHS)) {
            return $next($request);
        }

        $message = 'The system is under maintenance. Only maintenance actions are available right now.';

        if ($request->expectsJson()) {
            return response()->json(['message' => $message], 503);
        }

        return back()->with('error', $message);
    }
}
