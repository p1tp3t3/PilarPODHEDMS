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
            ['id' => 1, 'name' => 'BSIT', 'description' => 'Bachelor of Science in Information Technology'],
            ['id' => 2, 'name' => 'BLIS', 'description' => 'Bachelor of Library and Information Science'],
            ['id' => 3, 'name' => 'BEEd', 'description' => 'Bachelor of Elementary Education'],
            ['id' => 4, 'name' => 'BSN', 'description' => 'Bachelor of Science in Nursing'],
            ['id' => 5, 'name' => 'BSHM', 'description' => 'Bachelor of Science in Hospitality Management'],
            ['id' => 6, 'name' => 'BSBA', 'description' => 'Bachelor of Science in Business Administration'],
            ['id' => 7, 'name' => 'BSTM', 'description' => 'Bachelor of Science in Tourism Management'],
        ];

        foreach ($programs as $program) {
            DB::table('program')->updateOrInsert(
                ['id' => $program['id']],
                [
                    'name' => $program['name'],
                    'description' => $program['description'],
                    'created_at' => now(),
                ]
            );
        }
    }
}
