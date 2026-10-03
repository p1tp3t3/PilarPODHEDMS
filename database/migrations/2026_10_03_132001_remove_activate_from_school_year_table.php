<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * "Current school year" is now derived purely from whether today falls
 * inside one of its semesters' date_start/date_end ranges (see
 * SchoolYear::isCurrent(), SchoolYearSemester::current()) — this manually
 * toggled flag could drift out of sync with the actual calendar and is no
 * longer needed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('school_year', function (Blueprint $table) {
            $table->dropColumn('activate');
        });
    }

    public function down(): void
    {
        Schema::table('school_year', function (Blueprint $table) {
            $table->boolean('activate')->default(false);
        });
    }
};
