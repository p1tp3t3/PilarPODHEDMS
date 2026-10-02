<?php

namespace App\Http\Middleware;

use App\Models\SchoolYearSemester;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        // Each page controller passes its own, more detailed "user" prop
        // for whatever that page needs — but many of them build it as a
        // bare auth()->user() without eager-loading `profile`, which left
        // the sidebar/header/account-panel name and picture blank
        // depending on which page happened to be open. Those three always
        // read from here now instead, so the identity display no longer
        // depends on every controller remembering to load the relation.
        $user = $request->user()?->load(['profile', 'teachingStaff', 'nonTeachingStaff']);

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'username' => $user->username,
                    'role' => $user->role,
                    'profile' => $user->profile,
                    'teaching_staff' => $user->teachingStaff,
                    'non_teaching_staff' => $user->nonTeachingStaff,
                ] : null,
            ],
            'app_name' => config('app.name'),
            'force_account_setup' => (bool) session('force_account_setup'),
            // Shared (not per-dashboard-controller) so every dashboard page
            // can show it without each one needing to remember to query and
            // pass it separately.
            'current_school_year_semester' => SchoolYearSemester::current()?->load('schoolYear'),
            // Only meaningful while maintenance mode is NOT yet active (once
            // it flips on, everyone but a super admin is locked out anyway
            // by CheckMaintenanceMode, so there's no dashboard left to warn
            // them on) — lets every role see a countdown before it hits.
            'maintenance_mode_scheduled_at' => Cache::get('maintenance_mode', false)
                ? null
                : Cache::get('maintenance_mode_scheduled_at'),
        ];
    }
}
