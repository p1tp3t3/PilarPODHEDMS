<?php

namespace App\Http\Controllers;

use App\Mail\OTPMail;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class OTPVerificationController extends Controller
{
    public function contactIndex()
    {
        return Inertia::render('other/password-recovery');
    }

    public function store(Request $request)
    {
        $parentRegister = ! auth()->check() && $request->type == 'parent_register';
        $pin = random_int(100000, 999999);
        $email = $parentRegister
                ?
                $request->email
                :
                User::where('username', $request->username)->value('email');
        try {
            $key = $email.'_otp_hash';

            cache()->forget($key);
            cache()->put($key, Hash::make($pin));
            cache()->forget($key.'_verified');
            cache()->put($key.'_verified', false);
            Mail::to($email)
                ->send(new OTPMail($pin));

            return response()->json(['status' => 'success', 'message' => 'OTP sent successfully.']);
        } catch (\Throwable $e) {
            Log::error('Failed to send OTP', ['error' => $e->getMessage()]);

            return response()->json(['status' => 'error', 'message' => 'Failed to send OTP.', 'error' => $e->getMessage(), 'req' => $request->all()], 500);
        }
    }

    public function verify(Request $request)
    {
        $email = $request->email;
        $key = $email.'_otp_hash';

        if (! Hash::check($request->pin, cache($key))) {
            return response()->json(['status' => 'error'], 500);
        }
        cache()->put($key.'_verified', true);

        return response()->json(['status' => 'success', 'verified' => cache($key.'_verified')]);
    }
}
