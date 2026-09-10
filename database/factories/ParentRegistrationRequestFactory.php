<?php

namespace Database\Factories;

use App\Models\ParentRegistrationRequest;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ParentRegistrationRequest>
 */
class ParentRegistrationRequestFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * Matches the exact shape ParentController::store()/confirm() produce
     * and consume — 'name'/'email'/'reason' as top-level columns plus a
     * 'parent_details' JSON blob with the same keys the registration form
     * submits (first_name..sex, parent_role, contact_number, family_code,
     * reason, children[]). 'children' defaults empty here since this
     * factory has no real student to reference on its own — FamilySeeder
     * overrides it with a real student when seeding realistic pending
     * requests.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $firstName = fake()->firstName();
        $middleName = fake()->lastName();
        $lastName = fake()->lastName();
        $reason = fake()->randomElement([
            "Requesting access to monitor my child's academic and disciplinary records.",
            "I would like to keep track of my child's school activities and incidents.",
            "Need to stay updated on my child's attendance and behavior reports.",
        ]);

        return [
            'name' => "{$firstName} {$middleName} {$lastName}",
            'email' => fake()->unique()->safeEmail(),
            'reason' => $reason,
            'parent_details' => json_encode([
                'first_name' => $firstName,
                'middle_name' => $middleName,
                'last_name' => $lastName,
                'sex' => fake()->randomElement(['m', 'f']),
                'parent_role' => fake()->randomElement(['mother', 'father', 'guardian']),
                'contact_number' => '09' . fake()->numerify('#########'),
                'family_code' => '',
                'reason' => $reason,
                'children' => [],
            ]),
        ];
    }
}
