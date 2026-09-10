<?php

namespace Database\Seeders;

use App\Models\Family;
use App\Models\FamilyMember;
use App\Models\ParentRegistrationRequest;
use App\Models\Parents;
use App\Models\Profile;
use App\Models\User;
use App\Models\UserPermission;
use Illuminate\Database\Seeder;

class FamilySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Seeding family data...');

        $studentPool = User::where('role', 'student')->inRandomOrder()->pluck('id')->all();

        if (count($studentPool) < 2) {
            $this->command?->warn('FamilySeeder skipped: needs at least 2 students (run StudentSeeder first).');
            return;
        }

        $this->seedFamilies($studentPool);
        $this->seedPendingRequests($studentPool);
    }

    /**
     * Real, already-approved families: a Family row, 1-3 student children
     * (each drawn once from the shared pool so no student ends up in two
     * families), and 1-2 parent accounts (mother/father, or occasionally a
     * lone guardian) — mirrors what ParentController::storeFamily() itself
     * produces once a registration request is approved.
     */
    private function seedFamilies(array $studentPool): void
    {
        $familyCount = min(6, intdiv(count($studentPool), 2));

        for ($i = 0; $i < $familyCount; $i++) {
            $childCount = min(random_int(1, 3), count($studentPool));
            if ($childCount === 0) {
                break;
            }
            $children = array_splice($studentPool, 0, $childCount);

            $family = Family::factory()->create();

            foreach ($children as $studentId) {
                FamilyMember::create([
                    'family_id' => $family->id,
                    'member_id' => $studentId,
                ]);
            }

            $parentRoles = (random_int(0, 4) === 0) ? ['guardian'] : ['mother', 'father'];

            foreach ($parentRoles as $role) {
                $parentUser = User::factory()->create(['role' => 'parent']);

                Profile::factory()->for($parentUser, 'user')->create([
                    'sex' => match ($role) {
                        'father' => 'm',
                        'mother' => 'f',
                        default => fake()->randomElement(['m', 'f']),
                    },
                ]);
                UserPermission::factory()->for($parentUser, 'user')->create();
                Parents::factory()->for($parentUser, 'user')->create(['parent_role' => $role]);

                FamilyMember::create([
                    'family_id' => $family->id,
                    'member_id' => $parentUser->id,
                ]);
            }
        }
    }

    /**
     * A few STILL-PENDING parent registration requests, referencing real
     * students as the claimed "children" so an itrc admin reviewing the
     * seeded /super-admin/parent-request-list can actually approve one
     * (ParentController::storeFamily()) against a real account.
     */
    private function seedPendingRequests(array $studentPool): void
    {
        $candidates = collect($studentPool)->shuffle();
        $requestCount = min(4, $candidates->count());

        for ($i = 0; $i < $requestCount; $i++) {
            $child = User::with(['profile', 'program'])->find($candidates->pop());
            if (!$child) {
                continue;
            }

            ParentRegistrationRequest::factory()->create([
                'parent_details' => json_encode([
                    'first_name' => fake()->firstName(),
                    'middle_name' => fake()->lastName(),
                    'last_name' => $child->profile?->last_name ?? fake()->lastName(),
                    'sex' => fake()->randomElement(['m', 'f']),
                    'parent_role' => fake()->randomElement(['mother', 'father', 'guardian']),
                    'contact_number' => '09' . fake()->numerify('#########'),
                    'family_code' => '',
                    'reason' => "Requesting access to monitor {$child->profile?->first_name}'s records.",
                    'children' => [[
                        'student_id' => $child->id,
                        'first_name' => $child->profile?->first_name,
                        'middle_name' => $child->profile?->middle_name,
                        'last_name' => $child->profile?->last_name,
                        'program' => $child->program?->name,
                        'sex' => $child->profile?->sex,
                    ]],
                ]),
            ]);
        }
    }
}
