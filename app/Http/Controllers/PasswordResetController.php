<?php

namespace App\Http\Controllers;

use App\Mail\OTPMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class PasswordResetController extends Controller
{
    public function requestIndex()
    {
        return Inertia::render('other/password-recovery');
    }

    public function sendOtp(Request $request)
    {
        $request->validate(['username' => 'required|string']);

        $user = User::where('username', $request->username)
            ->orWhere('id_number', $request->username)
            ->first();
        if (! $user || ! $user->email) {
            return response()->json(['message' => 'No account found with that username.'], 404);
        }

        $pin = random_int(100000, 999999);
        cache()->put("password_reset_otp_{$user->username}", Hash::make($pin), now()->addMinutes(10));

        try {
            Mail::to($user->email)->send(new OTPMail($pin));
        } catch (\Throwable $e) {
            Log::error('Failed to send password reset OTP', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Failed to send verification code.'], 500);
        }

        return response()->json([
            'message' => 'success',
            'masked_email' => $this->maskEmail($user->email),
        ]);
    }

    // The frontend never receives the real email — only enough of it,
    // asterisked out, to reassure the user which inbox to check.
    private function maskEmail(string $email): string
    {
        [$local, $domain] = explode('@', $email, 2) + [1 => ''];
        $visible = mb_substr($local, 0, 2);

        return $visible.str_repeat('*', max(mb_strlen($local) - mb_strlen($visible), 3)).'@'.$domain;
    }

    // Verifying the OTP is only the delivery guarantee (only whoever
    // received the email could know it) — once confirmed here, a
    // short-lived cache flag authorizes the follow-up POST (reset())
    // the same way the old signed-URL flow did.
    public function verifyOtp(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'otp' => 'required|string',
        ]);

        $hashed = cache("password_reset_otp_{$request->username}");
        if (! $hashed || ! Hash::check($request->otp, $hashed)) {
            return response()->json(['message' => 'Invalid or expired code.'], 400);
        }

        cache()->forget("password_reset_otp_{$request->username}");
        cache()->put("password_reset_authorized_{$request->username}", true, now()->addMinutes(15));

        return response()->json(['message' => 'success']);
    }

    public function reset(Request $request, $username)
    {
        if (! cache("password_reset_authorized_{$username}")) {
            return response()->json(['message' => 'This session has expired. Please verify your code again.'], 400);
        }

        $request->validate([
            'new_password' => 'required|string|min:8',
        ]);

        $user = User::where('username', $username)->first();
        if (! $user) {
            return response()->json(['message' => 'Account not found.'], 404);
        }

        $user->update(['password' => Hash::make($request->new_password)]);
        cache()->forget("password_reset_authorized_{$username}");

        return response()->json(['message' => 'success']);
    }
}
