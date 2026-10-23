<?php

namespace Database\Factories;

use App\Models\EducationBackground;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\EducationBackground>
 */
class EducationBackgroundFactory extends Factory
{
    public function definition(): array
    {
        return [
            'student_id' => User::factory(),
            'education_type' => $this->faker->randomElement(['senior_high_school', 'college']),
            'transferee' => false,
        ];
    }

    // Senior high defaults to this school (students can change it later).
    public function seniorHigh(): static
    {
        return $this->state(fn () => [
            'education_type' => 'senior_high_school',
            'school_name' => EducationBackground::CURRENT_SCHOOL_NAME,
            'school_address' => EducationBackground::CURRENT_SCHOOL_ADDRESS,
        ]);
    }

    // Current college is always this school.
    public function currentCollege(): static
    {
        return $this->state(fn () => [
            'education_type' => 'college',
            'school_name' => EducationBackground::CURRENT_SCHOOL_NAME,
            'school_address' => EducationBackground::CURRENT_SCHOOL_ADDRESS,
        ]);
    }

    // Empty transferee row, as registration creates one for every student.
    public function transferee(): static
    {
        return $this->state(fn () => ['education_type' => 'college', 'transferee' => true]);
    }
}
