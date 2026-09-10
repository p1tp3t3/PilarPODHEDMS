<?php

namespace App\Http\Controllers;

use App\Mail\SignedLinkMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;

class PasswordResetController extends Controller
{
    public function requestIndex() {
        return Inertia::render('other/password-recovery');
    }

    public function sendLink(Request $request) {
        $request->validate(['username' => 'required|string']);

        $user = User::where('username', $request->username)
            ->orWhere('id_number', $request->username)
            ->first();
        if (!$user || !$user->email) {
            return response()->json(['message' => 'No account found with that username.'], 404);
        }

        $url = URL::temporarySignedRoute(
            'password.reset.form',
            now()->addMinutes(60),
            ['username' => $user->username]
        );

        try {
            Mail::to($user->email)->send(new SignedLinkMail(
                'Password Reset Request',
                'Reset Your Password',
                'We received a request to reset your password. Click the button below to choose a new one.',
                $url,
                'Reset Password'
            ));
        } catch (\Throwable $e) {
            Log::error('Failed to send password reset link', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Failed to send reset link.'], 500);
        }

        return response()->json(['message' => 'success']);
    }

    // The signed URL is only the delivery guarantee (unguessable, expires,
    // tamper-proof) — once it's validated here, a short-lived cache flag
    // authorizes the follow-up POST (reset()) without needing to re-derive
    // the Laravel signature across a GET->POST verb change.
    public function resetForm(Request $request, $username) {
        $valid = $request->hasValidSignature();

        if ($valid) {
            cache()->put("password_reset_authorized_{$username}", true, now()->addMinutes(15));
        }

        return Inertia::render('other/reset-password', [
            'username' => $username,
            'valid' => $valid || (bool) cache("password_reset_authorized_{$username}"),
        ]);
    }

    public function reset(Request $request, $username) {
        if (!cache("password_reset_authorized_{$username}")) {
            return response()->json(['message' => 'This reset link is invalid or has expired.'], 400);
        }

        $request->validate([
            'new_password' => 'required|string|min:8',
        ]);

        $user = User::where('username', $username)->first();
        if (!$user) {
            return response()->json(['message' => 'Account not found.'], 404);
        }

        $user->update(['password' => Hash::make($request->new_password)]);
        cache()->forget("password_reset_authorized_{$username}");

        return response()->json(['message' => 'success']);
    }
}
