<?php

namespace Database\Seeders;

use App\Models\ProgramHeadProgram;
use App\Models\Profile;
use App\Models\TeachingStaff;
use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Database\Seeder;

class TeachingStaffSeeder extends Seeder
{
    public function run(): void
    {
        $i = 1;

        // One program head per program (7 programs), plus a handful of regular faculty.
        for ($programId = 1; $programId <= 7; $programId++) {
            $this->createTeachingStaff($i++, $programId, true);
        }

        for ($j = 0; $j < 10; $j++) {
            $this->createTeachingStaff($i++, random_int(1, 7), false);
        }
    }

    private function createTeachingStaff(int $i, int $programId, bool $isProgramHead): void
    {
        $user = User::factory()->create([
            'id_number' => 'TS-' . str_pad($i, 4, '0', STR_PAD_LEFT),
            'role' => 'teaching_staff',
        ]);

        Profile::factory()->for($user, 'user')->create([
            'date_of_birth' => fake()->dateTimeBetween('-60 years', '-25 years')->format('Y-m-d'),
            'civil_status' => fake()->randomElement(['single', 'married']),
        ]);
        UserPermission::factory()->for($user, 'user')->create();

        $staff = TeachingStaff::factory()->for($user, 'user');
        $staff = $isProgramHead ? $staff->programHead() : $staff;
        $staff->create(['program_id' => $programId]);

        // program_head_program is the single source of truth
        // Program::programHead() reads from — every program head needs a
        // row here for the program they were just seeded to head, same as
        // RegisteredUserController::createUser() does for a real signup.
        if ($isProgramHead) {
            ProgramHeadProgram::create([
                'user_id' => $user->id,
                'program_id' => $programId,
            ]);
        }
    }
}
