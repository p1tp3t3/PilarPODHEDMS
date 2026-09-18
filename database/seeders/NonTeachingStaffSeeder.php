<?php

namespace Database\Seeders;

use App\Models\NonTeachingStaff;
use App\Models\Position;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Database\Seeder;

class NonTeachingStaffSeeder extends Seeder
{
    /**
     * One Guard, one Guidance, and one IT Staff (all three are load-bearing
     * — they're the accounts that gate pass verification and referral
     * intake/forwarding are checked against), plus a handful of the other
     * fixed positions.
     */
    public function run(): void
    {
        $i = 1;

        $this->createNonTeachingStaff($i++, 'guard');
        $this->createNonTeachingStaff($i++, 'guidance');
        $this->createNonTeachingStaff($i++, 'it staff');

        $otherPositions = ['Registrar', 'Librarian', 'Nurse', 'Administrative Staff', 'Maintenance Staff', 'Security Personnel'];
        foreach ($otherPositions as $position) {
            $this->createNonTeachingStaff($i++, $position);
        }
    }

    private function createNonTeachingStaff(int $i, string $position): void
    {
        $user = User::factory()->create([
            'id_number' => 'NTS-' . str_pad($i, 4, '0', STR_PAD_LEFT),
            'role' => 'non_teaching_staff',
        ]);

        Profile::factory()->for($user, 'user')->create([
            'date_of_birth' => fake()->dateTimeBetween('-60 years', '-25 years')->format('Y-m-d'),
            'civil_status' => fake()->randomElement(['single', 'married']),
        ]);
        UserPermission::factory()->for($user, 'user')->create();

        $staff = NonTeachingStaff::factory()->for($user, 'user');
        $staff = match ($position) {
            'guard' => $staff->guard(),
            'guidance' => $staff->guidance(),
            default => $staff->state(['position_id' => Position::idFor($position)]),
        };
        $staff->create();
    }
}
