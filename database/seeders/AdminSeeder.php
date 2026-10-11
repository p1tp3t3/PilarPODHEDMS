<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Seed one super admin and one sub admin account.
     */
    public function run(): void
    {
        self::createAdmin(
            role: 'super_admin',
            idNumber: 'SA-0001',
            username: 'superadmin',
            email: 'superadmin@example.com',
            firstName: 'Super',
            lastName: 'Admin',
        );

        self::createAdmin(
            role: 'sub_admin',
            idNumber: 'SB-0001',
            username: 'subadmin',
            email: 'marizdiaz101@gmail.com',
            firstName: 'Sub',
            lastName: 'Admin',
        );
    }

    private function createAdmin(
        string $role,
        string $idNumber,
        string $username,
        string $email,
        string $firstName,
        string $lastName,
    ): void {
        $userId = DB::table('users')->insertGetId([
            'id_number' => $idNumber,
            'username' => $username,
            'email' => $email,
            'email_verified_at' => now(),
            'already_update_password' => true,
            'password' => Hash::make('password'),
            'activate' => true,
            'created_at' => now(),
        ]);
        User::find($userId)->assignRole($role);
        $address = fake()->address();

        DB::table('profiles')->insert([
            'user_id' => $userId,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'current_address' => $address,
            'permanent_address' => $address,
        ]);
    }
}
