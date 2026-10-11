<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'id_number' => strtoupper(Str::random(2)) . '-' . fake()->unique()->numerify('####'),
            'username' => fake()->unique()->userName(),
            'email' => fake()->unique()->safeEmail(),
            'email_verified_at' => now(),
            'already_update_password' => true,
            'password' => static::$password ??= Hash::make('password'),
            'activate' => true,
        ];
    }

    /**
     * Every factory user gets an original role in user_roles — student
     * unless ->role(...) picked another one.
     */
    public function configure(): static
    {
        return $this->afterCreating(function (User $user) {
            if (! $user->userRoles()->exists()) {
                $user->assignRole('student');
            }
        });
    }

    /**
     * Create the user with this role (its original role in user_roles). Set
     * while the model is being made, so User::save() writes the user_roles
     * row before configure()'s student default runs.
     */
    public function role(string $role): static
    {
        return $this->afterMaking(fn (User $user) => $user->role = $role);
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn (array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
