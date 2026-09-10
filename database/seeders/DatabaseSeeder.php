<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        self::refresh_storage();
        self::call([
            AdminSeeder::class,
            ProgramSeeder::class,
            ViolationSeeder::class,
            StudentSeeder::class,
            TeachingStaffSeeder::class,
            NonTeachingStaffSeeder::class,
            FamilySeeder::class,
            ComplaintSeeder::class,
            ReferralSeeder::class,
            AbsenceSeeder::class,
            AppointmentSeeder::class,
            GatePassSeeder::class,
        ]);
        $this->command->info('Database seeded successfully.');
    }
    private function refresh_storage() {
        $private_folders = [
            storage_path('app/private/complaints'),
            storage_path('app/private/absent-forms'),
            storage_path('app/private/referrals'),
            storage_path('app/private/zips'),
            storage_path('app/private/generated-reports'),
            storage_path('app/private/backups'),
            storage_path('app/private/user-assets'),
        ];
        
        $public_folders = [
            storage_path('app/public/profile-pictures'),
            storage_path('app/public/program-logos'),
            storage_path('app/public/zips'),
            storage_path('app/public/lists'),
        ];

        $this->command->info('Refreshing storage folders...');

        // File::deleteDirectories() deletes the SUBdirectories *within* a
        // given path — not each path in a list — and throws if any listed
        // folder doesn't exist yet. Delete each one individually instead,
        // which is a safe no-op when the folder isn't there.
        foreach (array_merge($private_folders, $public_folders) as $folder) {
            File::deleteDirectory($folder);
            File::makeDirectory($folder, 0755, true);
        }

        // The public disk is useless without this symlink (public/storage
        // -> storage/app/public) — without it every profile picture/logo
        // URL 404s even though the file is sitting right there on disk.
        if (!File::exists(public_path('storage'))) {
            Artisan::call('storage:link');
        }

        $this->command->info('Storage folders refreshed successfully.');
    }
}
