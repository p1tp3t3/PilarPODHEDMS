<?php

namespace Database\Seeders;

use App\Models\SchoolYear;
use App\Models\SchoolYearSemester;
use Illuminate\Database\Seeder;

class SchoolYearSeeder extends Seeder
{
    /**
     * Other seeders backdate created_at up to a year (Complaint/Referral/
     * Absence) or 6 months (Appointment/GatePass), so every academic year a
     * seeded request could land in must exist before they run — otherwise
     * SchoolYearSemester::idForDate() has nothing to attach it to.
     */
    public function run(): void
    {
        $currentStartYear = now()->month >= 8 ? now()->year : now()->year - 1;

        foreach ([$currentStartYear - 1, $currentStartYear] as $startYear) {
            $isCurrent = $startYear === $currentStartYear;

            $schoolYear = SchoolYear::firstOrCreate(
                ['year' => "{$startYear}-" . ($startYear + 1)],
                ['activate' => $isCurrent]
            );

            foreach ([1, 2] as $semester) {
                [$dateStart, $dateEnd] = SchoolYearSemester::defaultDateRange($startYear, $semester);
                $schoolYear->semesters()->firstOrCreate(
                    ['semester' => $semester],
                    ['date_start' => $dateStart, 'date_end' => $dateEnd]
                );
            }
        }
    }
}
