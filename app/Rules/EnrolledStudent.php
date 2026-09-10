<?php

namespace App\Rules;

use App\Models\User;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Server-side counterpart to the enrolled/activated filter applied in
 * AccountController::searchAllUsers()'s 'student' case — the search only
 * ever *offers* enrolled, activated students, but nothing stopped a request
 * built outside that search box (a replayed/hand-crafted request) from
 * targeting an unenrolled/not-yet-activated student, or a non-student
 * (e.g. a parent) id directly.
 */
class EnrolledStudent implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $exists = User::where('id', $value)
            ->where('role', 'student')
            ->where('activate', true)
            ->whereHas('enrollment')
            ->exists();

        if (!$exists) {
            $fail('The selected user must be a currently enrolled, activated student.');
        }
    }
}
