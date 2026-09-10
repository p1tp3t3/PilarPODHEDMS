<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class ProfileAuthorization
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $authRole = auth()->user()->role;
        $username = $request->route('username');
        $targetUser = User::where('username', $username)->first();

        if (!$targetUser) {
            abort(404, 'User not found.');
        }

        $targetRole = $targetUser->role;

        // Check if current user is allowed to access the target user role
        if (!self::checkRole($authRole, $targetRole)) {
            if (self::restrictProfileAccess($targetUser->username)) {
                return Inertia::location('/');
            }
        }

        return $next($request);
    }

    protected function checkRole(string $authRole, string $targetRole): bool
    {
        $allowedRoles = [
            'student'            => ['super_admin', 'sub_admin', 'parent'],
            'sub_admin'          => ['sub_admin', 'super_admin', 'teaching_staff', 'student', 'parent'],
            'super_admin'        => ['super_admin', 'sub_admin', 'teaching_staff', 'student', 'parent'],
            'teaching_staff'     => ['teaching_staff', 'super_admin', 'sub_admin', 'student'],
            'parent'             => ['parent', 'student', 'super_admin', 'sub_admin'],
            // "guard"/"guidance" aren't separate roles — every
            // non_teaching_staff position (including those two) shares this
            // one entry, since $authRole can only ever be the literal role.
            'non_teaching_staff' => ['non_teaching_staff', 'super_admin', 'sub_admin'],
        ];

        return isset($allowedRoles[$authRole]) && in_array($targetRole, $allowedRoles[$authRole]);
    }

    protected function restrictProfileAccess($target): bool
    {
        $authUsername = auth()->user()->username;
        $authRole = auth()->user()->role;

        // 🔹 These roles can ONLY see their own profile
        if (in_array($authRole, ['student', 'parent', 'teaching_staff'])) {
            return $authUsername !== $target;
        }

        return false;
    }
}
