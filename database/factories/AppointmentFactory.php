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

        return [
            'user_id' => $user?->id,
            'date_time_appoint' => $dateTimeAppoint,
            'appointment_status' => $status,
            'rejected_reason' => $status === 'rejected' ? $this->faker->sentence(8) : null,
            'confirmed_at' => $confirmedAt,
            'description' => $this->faker->sentence(10),
            'school_year_semester_id' => SchoolYearSemester::idForDate($createdAt),
            'created_at' => $createdAt,
        ];
    }
}
