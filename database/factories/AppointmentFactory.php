<?php

namespace Database\Factories;

use App\Models\SchoolYearSemester;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Appointment>
 */
class AppointmentFactory extends Factory
{
    public function definition(): array
    {
        $user = User::whereIn('role', ['student', 'parent'])->inRandomOrder()->first()
            ?? User::inRandomOrder()->first();

        $createdAt = $this->faker->dateTimeBetween('-6 months', 'now');
        $dateTimeAppoint = Carbon::parse($createdAt)
            ->addDays(rand(1, 10))
            ->setTime(rand(8, 16), $this->faker->randomElement([0, 15, 30, 45]));

        $status = $this->faker->randomElement(['pending', 'accepted', 'accepted', 'rejected']);
        $confirmedAt = $status !== 'pending' ? Carbon::parse($createdAt)->addDays(rand(1, 3)) : null;

        // Attendance is only ever recorded for accepted appointments whose
        // date has already passed — a future or still-pending/rejected one
        // has nothing to mark yet. Some past ones are left "not_marked" too,
        // since a prefect won't always remember to record it.
        $attendanceStatus = ($status === 'accepted' && $dateTimeAppoint->isPast())
            ? $this->faker->randomElement(['present', 'present', 'present', 'absent', 'not_marked'])
            : 'not_marked';

        return [
            'user_id' => $user?->id,
            'date_time_appoint' => $dateTimeAppoint,
            'appointment_status' => $status,
            'attendance_status' => $attendanceStatus,
            'rejected_reason' => $status === 'rejected' ? $this->faker->sentence(8) : null,
            'confirmed_at' => $confirmedAt,
            'description' => $this->faker->sentence(10),
            'school_year_semester_id' => SchoolYearSemester::idForDate($createdAt),
            'created_at' => $createdAt,
        ];
    }
}
