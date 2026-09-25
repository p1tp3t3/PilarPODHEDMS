<?php

use App\Models\SchoolYearSemester;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('school_year_semester', function (Blueprint $table) {
            $table->date('date_start')->nullable()->after('semester');
            $table->date('date_end')->nullable()->after('date_start');
            // Set once the end-of-semester pending-cases notification has
            // been sent for this semester, so the daily check never
            // re-notifies for the same one.
            $table->timestamp('notified_at')->nullable()->after('date_end');
        });

        // Backfill every existing semester with its Aug-Jul default range,
        // parsed from the school year's own "YYYY-YYYY" label — the same
        // heuristic SchoolYearSemester::idForDate() used to hardcode.
        foreach (SchoolYearSemester::with('schoolYear')->get() as $semester) {
            $startYear = (int) explode('-', $semester->schoolYear->year)[0];
            [$dateStart, $dateEnd] = SchoolYearSemester::defaultDateRange($startYear, $semester->semester);
            $semester->update(['date_start' => $dateStart, 'date_end' => $dateEnd]);
        }

        Schema::table('school_year_semester', function (Blueprint $table) {
            $table->dropColumn('is_active');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('school_year_semester', function (Blueprint $table) {
            $table->boolean('is_active')->default(false)->after('semester');
        });

        Schema::table('school_year_semester', function (Blueprint $table) {
            $table->dropColumn(['date_start', 'date_end', 'notified_at']);
        });
    }
};
