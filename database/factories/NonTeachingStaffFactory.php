<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\NonTeachingStaff>
 */
class NonTeachingStaffFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'position' => fake()->randomElement([
                'Registrar', 'Librarian', 'Nurse',
                'Administrative Staff', 'Maintenance Staff', 'Security Personnel',
            ]),
        ];
    }

    public function guard(): static
    {
        return $this->state(fn (array $attributes) => [
            'position' => 'Guard',
        ]);
    }

    public function guidance(): static
    {
        return $this->state(fn (array $attributes) => [
            'position' => 'Guidance',
        ]);
    }
}
