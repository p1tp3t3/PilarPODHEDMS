<?php

namespace Database\Seeders;

use App\Models\Appointment;
use App\Models\User;
use Illuminate\Database\Seeder;

class AppointmentSeeder extends Seeder
{
    public function run(int $count = 20): void
    {
        $users = User::whereRole(['student', 'parent'])->pluck('id')->all();

        if (count($users) < 1) {
            $this->command?->warn('AppointmentSeeder skipped: needs at least 1 student (run StudentSeeder first).');
            return;
        }

        for ($i = 0; $i < $count; $i++) {
            Appointment::factory()->create([
                'user_id' => $users[array_rand($users)],
            ]);
        }
    }
}
