<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Program>
 *
 * The app's real program catalog (IDs 1-7) is seeded by database/seeders/ProgramSeeder.php,
 * which the registration CSV validation hardcodes against. This factory is for
 * ad-hoc/test programs outside that fixed catalog.
 */
class ProgramFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => strtoupper($this->faker->lexify('????')),
            'name' => 'Bachelor of Science in ' . $this->faker->words(2, true),
        ];
    }
}
