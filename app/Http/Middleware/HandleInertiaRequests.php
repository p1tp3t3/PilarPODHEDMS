<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
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
            'vapid_public_key' => config('webpush.vapid.public_key'),
        ];
    }
}
