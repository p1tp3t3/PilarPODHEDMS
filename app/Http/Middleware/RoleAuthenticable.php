<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Inertia\Inertia;

class RoleAuthenticable
{
    /**
     * Handle an incoming request.
     *
     * Usage: ->middleware('role:super_admin') or ->middleware('role:program_head,faculty,sub_admin')
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        if (!auth()->check() || !in_array(auth()->user()->role, $roles, true)) {
            if (auth()->check()) {
                \App\Support\BreachLog::record(
                    'unauthorized_access', 'medium',
                    'Opened a page for '.implode(', ', $roles).' as '.auth()->user()->role,
                    ['allowed_roles' => $roles]
                );
            }
            return Inertia::location(route('type.user'));
        }

        return $next($request);
    }
}
