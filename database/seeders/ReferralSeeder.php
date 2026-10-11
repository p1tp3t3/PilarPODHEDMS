<?php

namespace Database\Seeders;

use App\Models\Referral;
use App\Models\ReferralReferredStudent;
use App\Models\User;
use Illuminate\Database\Seeder;

class ReferralSeeder extends Seeder
{
    public function run(int $count = 20): void
    {
        $students = User::whereRole('student')->pluck('id')->all();

        if (count($students) < 1) {
            $this->command?->warn('ReferralSeeder skipped: needs at least 1 student (run StudentSeeder first).');
            return;
        }

        for ($i = 0; $i < $count; $i++) {
            $referral = Referral::factory()->create();

            $candidates = $students;
            shuffle($candidates);
            $subjectIds = array_slice($candidates, 0, random_int(1, 2));

            foreach ($subjectIds as $studentId) {
                ReferralReferredStudent::factory()->create([
                    'referral_id' => $referral->id,
                    'student_id' => $studentId,
                ]);
            }
        }
    }
}
