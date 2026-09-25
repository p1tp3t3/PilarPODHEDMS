<?php

namespace App\Rules;

use Carbon\Carbon;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Appointments (schedule and reschedule alike) may only be booked for a
 * time within office hours, 7:00 AM to 4:30 PM.
 */
class WithinAppointmentHours implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        try {
            $time = Carbon::createFromFormat('H:i', $value);
        } catch (\Exception $e) {
            $fail('The appointment time is invalid.');

            return;
        }

        $min = Carbon::createFromFormat('H:i', '07:00');
        $max = Carbon::createFromFormat('H:i', '16:30');

        if ($time->lt($min) || $time->gt($max)) {
            $fail('Appointments can only be scheduled between 7:00 AM and 4:30 PM.');
        }
    }
}
