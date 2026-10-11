<?php

namespace Database\Seeders;

use App\Models\EducationBackground;
use App\Models\Enrollment;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Database\Seeder;

class StudentSeeder extends Seeder
{
    public function run(int $count = 30): void
    {
        $emails = [
            'markruen04@gmail.com',
            'markguanzon57@gmail.com'
        ];

        for ($i = 1; $i <= $count; $i++) {
            $user = User::factory()->role('student')->create([
                'id_number' => '2025-' . str_pad($i, 5, '0', STR_PAD_LEFT),
                'email' => ($emails[$i - 1] ?? fake()->unique()->safeEmail()),
            ]);

            Profile::factory()->for($user, 'user')->create();
            UserPermission::factory()->for($user, 'user')->create();

            // Most students are currently enrolled; a few have dropped.
            $enrollment = Enrollment::factory()->for($user, 'student');
            $enrollment = ($i % 10 === 0) ? $enrollment->dropped() : $enrollment;
            $enrollment->create(['program_id' => random_int(1, 7)]);

            EducationBackground::factory()->for($user, 'user')->create(['education_type' => 'senior_high_school']);
            EducationBackground::factory()->for($user, 'user')->create(['education_type' => 'college']);
        }
    }
}
