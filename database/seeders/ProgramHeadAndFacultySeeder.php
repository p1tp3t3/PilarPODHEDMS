<?php

namespace Database\Seeders;

use App\Models\Profile;
use App\Models\User;
use App\Models\UserIdNumber;
use App\Models\UserPermission;
use Illuminate\Database\Seeder;

/** Program heads (one per program) and faculty. */
class ProgramHeadAndFacultySeeder extends Seeder
{
    public function run(): void
    {
        $i = 1;

        // One program head per program (7 programs), plus a handful of regular faculty.
        for ($programId = 1; $programId <= 7; $programId++) {
            $this->createProgramHeadOrFaculty($i++, $programId, true);
        }

        for ($j = 0; $j < 10; $j++) {
            $this->createProgramHeadOrFaculty($i++, random_int(1, 7), false);
        }

        $this->createFormerStudentFaculty($i++, 1);
    }

    /**
     * A faculty member who used to be a student here: registered with a
     * student ID, later moved to faculty with a staff ID. The
     * student ID stays in user_id_numbers as history.
     */
    private function createFormerStudentFaculty(int $i, int $programId): void
    {
        $user = User::factory()->role('student')->create([
            'id_number' => '2021-00090',
            'created_at' => now()->subYears(5),
        ]);
        UserIdNumber::where('user_id', $user->id)->update(['started_at' => now()->subYears(5)]);

        Profile::factory()->for($user, 'user')->create([
            'date_of_birth' => fake()->dateTimeBetween('-30 years', '-24 years')->format('Y-m-d'),
            'civil_status' => 'single',
        ]);
        UserPermission::factory()->for($user, 'user')->create();

        // Became faculty a year ago: new staff ID, student ID kept as history.
        UserIdNumber::change($user, 'TS-'.str_pad($i, 4, '0', STR_PAD_LEFT), 'faculty');
        UserIdNumber::where('user_id', $user->id)->whereNotNull('ended_at')->update(['ended_at' => now()->subYear()]);
        UserIdNumber::where('user_id', $user->id)->whereNull('ended_at')->update(['started_at' => now()->subYear()]);
        $user->assignRole('faculty');

        $user->assignTeaching('faculty', $programId);
    }

    private function createProgramHeadOrFaculty(int $i, int $programId, bool $isProgramHead): void
    {
        $user = User::factory()->role($isProgramHead ? 'program_head' : 'faculty')->create([
            'id_number' => 'TS-' . str_pad($i, 4, '0', STR_PAD_LEFT),
        ]);

        Profile::factory()->for($user, 'user')->create([
            'date_of_birth' => fake()->dateTimeBetween('-60 years', '-25 years')->format('Y-m-d'),
            'civil_status' => fake()->randomElement(['single', 'married']),
        ]);
        UserPermission::factory()->for($user, 'user')->create();

        // A faculty row, or a program_head row for the program they head.
        $user->assignTeaching($isProgramHead ? 'program_head' : 'faculty', $programId);
    }
}
