<?php

namespace App\Http\Controllers;

use App\Models\ActionLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use App\Http\Resources\Account\UserResource;

class AccountSetupController extends Controller
{
    /**
     * Step 1 of forced setup: the user must verify their email before
     * reaching the profile/password steps. Already-verified users are
     * bounced straight to the profile step (this page has nothing left for
     * them to do).
     */
    public function verifyEmailPrompt()
    {
        $user = auth()->user();

        if ($user->hasVerifiedEmail()) {
            return redirect('/force-change/'.encrypt_id($user->id));
        }

        return Inertia::render('guest/verify-email', [
            'user' => new UserResource($user),
            'email' => $user->email,
        ]);
    }

    /**
     * Steps 2 and 3 of forced setup share one URL (/force-change/{username})
     * and one page — reuses the exact same page-rendering logic as the
     * voluntary profile-edit route (ProfileController::edit). The page
     * itself (resources/js/Pages/student/edit-profile-form.jsx) renders the
     * profile form first, then the password form (AccountSettingsForm,
     * normally reached via the unrelated /settings/{id} route) in place once
     * the profile step is done — a local view change, not a navigation, so
     * nothing here needs to dispatch to AccountController::accountSettingsIndex.
     */
    public function showStep($key)
    {
        if (! session('force_account_setup')) {
            abort(404);
        }

        // Always the signed-in user's own setup, whatever the URL segment says.
        return (new ProfileController)->edit(encrypt_id(auth()->id()));
    }

    /**
     * The super admin changed this user's password: they set their own before
     * using the app. Only while the session is flagged at login.
     */
    public function forcePassword()
    {
        if (! session('force_password_change')) {
            return redirect()->route('auth.dashboard');
        }

        $user = auth()->user()->load('profile');

        return Inertia::render('shared/force-password', [
            'user' => new UserResource($user),
            'targetAccount' => [
                'id' => $user->id,
                'id_number' => $user->id_number,
                'encrypted_id' => encrypt_id($user->id),
                'username' => $user->username,
                'email' => $user->email,
                'role' => $user->role,
                'profile' => $user->profile,
            ],
        ]);
    }

    public function forcePasswordUpdate(Request $request)
    {
        if (! session('force_password_change')) {
            abort(404);
        }

        $user = auth()->user();
        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json(['error' => 'Current password is incorrect'], 422);
        }
        if (Hash::check($request->password, $user->password)) {
            return response()->json(['error' => 'Choose a password different from the one the administrator set.'], 422);
        }

        $user->update([
            'password' => Hash::make($request->password),
            'already_update_password' => true,
            'must_change_password' => false,
        ]);
        session()->forget('force_password_change');

        ActionLog::log($user->id, 'account_update', 'Set a new password after an administrator changed it',
            ['password' => ['from' => '••••••••', 'to' => '••••••••']]);

        return response()->json(['message' => 'successfully']);
    }

    public function resendVerificationEmail()
    {
        $user = auth()->user();

        if (! $user->hasVerifiedEmail()) {
            $user->sendEmailVerificationNotification();
        }

        return response()->json(['message' => 'Verification link sent.']);
    }

    /**
     * Complete forced first-login setup: profile completion and the
     * password change are submitted together and persisted atomically —
     * neither is saved unless both are present and valid.
     */
    public function complete(Request $request)
    {
        $user = auth()->user();

        if (! session('force_account_setup')) {
            abort(404);
        }

        // Teaching and non-teaching staff only fill in picture, sex, contact
        // number, and address (resources/js/Components/modal/submission-form/edit-profile-modal.jsx
        // hides religion/citizenship/civil status/date & place of birth for
        // these roles) — requiring them here too would reject every staff
        // submission outright.
        $isStaffRole = in_array($user->role, ['program_head', 'faculty', 'non_teaching_staff']);

        $request->validate([
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
            'religion' => $isStaffRole ? 'nullable|string' : 'required|string',
            'citizenship' => $isStaffRole ? 'nullable|string' : 'required|string',
            'civil_status' => $isStaffRole ? 'nullable|string' : 'required|string',
            'date_of_birth' => $isStaffRole ? 'nullable|date' : 'required|date',
            'place_of_birth' => $isStaffRole ? 'nullable|string' : 'required|string',
            'sex' => 'required|in:m,f',
            'phone_number' => $isStaffRole ? 'required|string' : 'nullable|string',
            'current_place' => 'required|string',
            'current_city' => 'required|string',
            'current_province' => 'required|string',
            'current_zipcode' => 'required|string',
            'permanent_place' => 'required|string',
            'permanent_city' => 'required|string',
            'permanent_province' => 'required|string',
            'permanent_zipcode' => 'required|string',
        ]);

        if (! Hash::check($request->current_password, $user->password)) {
            return response()->json(['error' => 'Current password is incorrect'], 422);
        }

        DB::transaction(function () use ($request, $user) {
            (new ProfileController)->applyProfileFields($user, $request);

            $user->update([
                'password' => Hash::make($request->password),
                'already_update_profile' => true,
                'already_update_password' => true,
                'must_change_password' => false,
            ]);
        });

        session()->forget(['force_account_setup', 'force_password_change']);

        ActionLog::create([
            'user_id' => $user->id,
            'action_type' => 'account_setup',
            'details' => 'completed forced profile and password setup',
        ]);

        return response()->json(['message' => 'successfully']);
    }
}
