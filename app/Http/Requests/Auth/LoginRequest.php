<?php

namespace App\Http\Requests\Auth;

use App\Models\User;
use App\Support\BreachLog;
use Illuminate\Auth\Events\Lockout;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'username' => 'required|string',
            'password' => 'required|string',
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @return \App\Models\User
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function authenticate(): User
    {
        $this->ensureIsNotRateLimited();

        $field = User::where('username', $this->username)->exists()
            ? 'username'
            : (User::where('id_number', $this->username)->exists() ? 'id_number' : null);

        if (is_null($field)) {
            RateLimiter::hit($this->throttleKey());
            BreachLog::record('failed_login', 'low', 'Login with an unknown account "'.$this->string('username').'"');

            throw ValidationException::withMessages([
                'username' => "Account doesn't exist. Please try again",
            ]);
        }

        if (! Auth::attempt([$field => $this->username, 'password' => $this->password])) {
            RateLimiter::hit($this->throttleKey());
            BreachLog::record('failed_login', 'low', 'Wrong password for "'.$this->string('username').'"');

            throw ValidationException::withMessages([
                'password' => 'Wrong password. Please try again',
            ]);
        }

        RateLimiter::clear($this->throttleKey());

        return Auth::user();
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));
        BreachLog::record('brute_force', 'high', 'Login locked after repeated failures for "'.$this->string('username').'"', [
            'attempts' => RateLimiter::attempts($this->throttleKey()),
        ]);

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'username' => "Too many login attempts. Please try again in {$seconds} seconds.",
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        return Str::transliterate(Str::lower($this->string('username')).'|'.$this->ip());
    }
}
