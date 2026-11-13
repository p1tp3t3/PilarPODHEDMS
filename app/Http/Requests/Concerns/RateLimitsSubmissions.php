<?php

namespace App\Http\Requests\Concerns;

use App\Support\BreachLog;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

/**
 * Rate limits a form request: each user (or IP, for guests) may submit it
 * $perMinute times a minute (default 10). Checked before authorization and
 * validation, so every submission counts. Set $perMinute in the class.
 */
trait RateLimitsSubmissions
{
    public function validateResolved()
    {
        $this->ensureIsNotRateLimited();

        parent::validateResolved();
    }

    protected function ensureIsNotRateLimited(): void
    {
        $key = $this->submissionThrottleKey();
        $max = property_exists($this, 'perMinute') ? $this->perMinute : 10;

        if (RateLimiter::tooManyAttempts($key, $max)) {
            $seconds = RateLimiter::availableIn($key);

            // Logged once per lockout, not on every blocked try.
            if (RateLimiter::attempts($key) === $max) {
                BreachLog::record('rate_limited', 'medium', 'Too many submissions of '.class_basename($this).' to /'.ltrim($this->path(), '/'));
            }
            RateLimiter::hit($key);

            throw ValidationException::withMessages([
                'rate_limit' => "Too many requests. Please try again in {$seconds} seconds.",
            ]);
        }

        RateLimiter::hit($key);
    }

    protected function submissionThrottleKey(): string
    {
        $who = $this->user()?->id ? 'user:'.$this->user()->id : 'ip:'.$this->ip();

        return 'form-request|'.static::class.'|'.$who;
    }
}
