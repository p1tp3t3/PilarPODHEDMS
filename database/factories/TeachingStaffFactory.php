<?php

namespace Database\Factories;

use App\Models\Position;
use App\Models\Program;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\TeachingStaff>
 */
class TeachingStaffFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'program_id' => Program::factory(),
            'position_id' => Position::idFor('faculty'),
        ];
    }

    public function programHead(): static
    {
        return $this->state(fn (array $attributes) => [
            'position_id' => Position::idFor('program_head'),
        ]);
    }
}
