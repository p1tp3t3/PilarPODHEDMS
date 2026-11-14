<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ProgramSeeder extends Seeder
{
    /**
     * Matches the program IDs 1-7 hardcoded in the registration CSV validation
     * (resources/js/Pages/super-admin/register.jsx errProgram()).
     */
    public function run(): void
    {
        $programs = [
            ['id' => 1, 'code' => 'BSIT', 'name' => 'Bachelor of Science in Information Technology'],
            ['id' => 2, 'code' => 'BLIS', 'name' => 'Bachelor of Library and Information Science'],
            ['id' => 3, 'code' => 'BEEd', 'name' => 'Bachelor of Elementary Education'],
            ['id' => 4, 'code' => 'BSN', 'name' => 'Bachelor of Science in Nursing'],
            ['id' => 5, 'code' => 'BSHM', 'name' => 'Bachelor of Science in Hospitality Management'],
            ['id' => 6, 'code' => 'BSBA', 'name' => 'Bachelor of Science in Business Administration'],
            ['id' => 7, 'code' => 'BSTM', 'name' => 'Bachelor of Science in Tourism Management'],
        ];

        foreach ($programs as $program) {
            DB::table('program')->updateOrInsert(
                ['id' => $program['id']],
                [
                    'code' => $program['code'],
                    'name' => $program['name'],
                    'created_at' => now(),
                ]
            );
        }
    }
}
