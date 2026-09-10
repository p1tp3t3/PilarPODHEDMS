<?php

namespace Database\Factories;

use App\Models\Program;
use App\Models\SchoolYear;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Enrollment>
 */
class EnrollmentFactory extends Factory
{
    public function definition(): array
    {
        // enrollment.school_year (string) was replaced by school_year_id (FK)
        // in a later migration — firstOrCreate rather than SchoolYear::factory()
        // so every seeded enrollment shares the ONE active "2025-2026" row
        // instead of tripping the `year` column's unique constraint.
        $schoolYearId = SchoolYear::firstOrCreate(
            ['year' => '2025-2026'],
            ['activate' => true]
        )->id;

        return [
            'student_id' => User::factory(),
            'program_id' => Program::factory(),
            'school_year_id' => $schoolYearId,
            'semester' => 1,
            'year_level' => $this->faker->numberBetween(1, 4),
            'status' => 'enrolled',
            'enrolled_at' => $this->faker->dateTimeBetween('-6 months', 'now')->format('Y-m-d'),
            'dropped_at' => null,
        ];
    }

    public function dropped(): static
    {
        return $this->state(fn (array $attributes) => [
            'status' => 'dropped',
            'dropped_at' => $this->faker->dateTimeBetween('-1 month', 'now')->format('Y-m-d'),
        ]);
    }
}
