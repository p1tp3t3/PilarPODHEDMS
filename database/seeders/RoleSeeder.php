<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    public const ROLES = [
        'super_admin' => 'System Admin',
        'sub_admin' => 'Prefect',
        'student' => 'Student',
        'program_head' => 'Program Head',
        'faculty' => 'Faculty',
        'non_teaching_staff' => 'Non-Teaching Staff',
        'parent' => 'Parent',
    ];

    public function run(): void
    {
        foreach (self::ROLES as $name => $label) {
            Role::updateOrCreate(['name' => $name], ['label' => $label]);
        }
    }
}
