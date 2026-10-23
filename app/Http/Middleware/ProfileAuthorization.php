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

        // Student data privacy: a student's profile is only for the student,
        // the prefect / IT admin, their own parent, and teaching staff of the
        // student's own program. Everyone else is sent home.
        if ($targetRole === 'student' && ! self::canViewStudentProfile($targetUser)) {
            return Inertia::location('/');
        }

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

    protected function canViewStudentProfile(User $student): bool
    {
        $viewer = auth()->user();

        if ($viewer->id === $student->id || in_array($viewer->role, ['sub_admin', 'super_admin'])) {
            return true;
        }

        if ($viewer->role === 'parent') {
            $familyIds = \App\Models\FamilyMember::where('member_id', $viewer->id)->pluck('family_id');

            return $familyIds->isNotEmpty()
                && \App\Models\FamilyMember::whereIn('family_id', $familyIds)->where('member_id', $student->id)->exists();
        }

        if ($viewer->role === 'teaching_staff') {
            $programId = \App\Models\Enrollment::where('student_id', $student->id)->latest('id')->value('program_id');

            return $programId && \App\Models\TeachingStaff::programIdsFor($viewer->id)->contains($programId);
        }

        return false;
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
