<?php

namespace Database\Seeders;

use App\Models\GatePass;
use App\Models\User;
use Illuminate\Database\Seeder;

class GatePassSeeder extends Seeder
{
    public function run(int $count = 20): void
    {
        $students = User::whereRole('student')->pluck('id')->all();

        if (count($students) < 1) {
            $this->command?->warn('GatePassSeeder skipped: needs at least 1 student (run StudentSeeder first).');
            return;
        }

        for ($i = 0; $i < $count; $i++) {
            GatePass::factory()->create([
                'user_id' => $students[array_rand($students)],
            ]);
        }
    }
}
