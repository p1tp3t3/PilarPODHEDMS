<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * See 2026_10_03_132002_remove_school_year_semester_columns_from_absent_form_table
 * for why — same derived-from-created_at approach via Appointment::schoolYearSemester().
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointment', function (Blueprint $table) {
            $table->dropConstrainedForeignId('school_year_semester_id');
        });
    }

    public function down(): void
    {
        Schema::table('appointment', function (Blueprint $table) {
            $table->foreignId('school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
        });
    }
};
