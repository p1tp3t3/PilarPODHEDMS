<?php

namespace Database\Seeders;

use App\Models\Absence;
use App\Models\User;
use Illuminate\Database\Seeder;

class AbsenceSeeder extends Seeder
{
    public function run(int $count = 25): void
    {
        $students = User::whereRole('student')->pluck('id')->all();

        if (count($students) < 1) {
            $this->command?->warn('AbsenceSeeder skipped: needs at least 1 student (run StudentSeeder first).');
            return;
        }

        for ($i = 0; $i < $count; $i++) {
            Absence::factory()->create([
                'student_id' => $students[array_rand($students)],
            ]);
        }
    }
}
