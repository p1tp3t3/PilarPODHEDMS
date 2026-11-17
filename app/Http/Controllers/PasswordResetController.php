<?php

namespace App\Http\Controllers;

use App\Mail\OTPMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class PasswordResetController extends Controller
{
    public function requestIndex()
    {
        return Inertia::render('guest/password-recovery');
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
        cache()->put("password_reset_otp_tries_{$user->username}", 0, now()->addMinutes(10));

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

        $otpKey = "password_reset_otp_{$request->username}";
        $triesKey = "password_reset_otp_tries_{$request->username}";

        $hashed = cache($otpKey);
        if (! $hashed || ! Hash::check($request->otp, $hashed)) {
            // Too many wrong guesses: the code is discarded; a new one is needed.
            if ($hashed && cache()->increment($triesKey) >= 5) {
                cache()->forget($otpKey);
                cache()->forget($triesKey);
            }

            return response()->json(['message' => 'Invalid or expired code.'], 400);
        }

        cache()->forget($otpKey);
        cache()->forget($triesKey);
        // The approval lives in this browser's session only, so nobody
        // else can use the 15-minute window to set the password.
        $request->session()->regenerate();
        $request->session()->put('password_reset', [
            'username' => $request->username,
            'expires_at' => now()->addMinutes(15)->timestamp,
        ]);

        return response()->json(['message' => 'success']);
    }

    public function reset(Request $request, $username)
    {
        $approval = $request->session()->get('password_reset');
        if (! is_array($approval)
            || ! hash_equals((string) $approval['username'], (string) $username)
            || $approval['expires_at'] < now()->timestamp) {
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
        $request->session()->forget('password_reset');

        // Sign the account out everywhere: whoever knew the old password
        // loses access too.
        DB::table('sessions')->where('user_id', $user->id)->delete();

        return response()->json(['message' => 'success']);
    }
}
