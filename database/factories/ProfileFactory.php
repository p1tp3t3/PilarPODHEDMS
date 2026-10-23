<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Profile>
 */
class ProfileFactory extends Factory
{
    private const BARANGAYS = [
        'Tetuan', 'Tumaga', 'Putik', 'Sta. Maria', 'Guiwan', 'Pasonanca', 'San Jose Gusu', 'Baliwasan',
        'Canelar', 'Camino Nuevo', 'Cawa Cawa', 'Talon-Talon', 'Divisoria', 'Ayala', 'Recodo', 'San Roque',
    ];

    /**
     * An address in the "place,city,province,zipcode" format the profile
     * form splits on commas — so the place itself must not contain one.
     */
    public static function zamboangaAddress(): string
    {
        $place = fake()->buildingNumber() . ' ' . str_replace(',', '', fake()->streetName()) . ' Brgy. ' . fake()->randomElement(self::BARANGAYS);

        return "{$place},Zamboanga City,Zamboanga Del Sur,7000";
    }

    public function definition(): array
    {
        $sex = $this->faker->randomElement(['m', 'f']);

        return [
            'user_id' => User::factory(),
            'first_name' => $this->faker->firstName($sex === 'm' ? 'male' : 'female'),
            'middle_name' => $this->faker->lastName(),
            'last_name' => $this->faker->lastName(),
            'sex' => $sex,
            'date_of_birth' => $this->faker->dateTimeBetween('-24 years', '-17 years')->format('Y-m-d'),
            'civil_status' => 'single',
            'religion' => 'Catholic',
            'citizenship' => 'Filipino',
            'current_address' => self::zamboangaAddress(),
            'permanent_address' => self::zamboangaAddress(),
            'contact_number' => '09' . $this->faker->numerify('#########'),
        ];
    }
}
