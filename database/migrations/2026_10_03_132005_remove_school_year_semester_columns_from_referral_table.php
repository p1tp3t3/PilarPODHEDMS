<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * See 2026_10_03_132002_remove_school_year_semester_columns_from_absent_form_table
 * for why — same derived-from-timestamps approach via Referral's
 * HasDerivedSchoolYearSemester trait.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('referral', function (Blueprint $table) {
            $table->dropConstrainedForeignId('school_year_semester_id');
            $table->dropConstrainedForeignId('confirmed_school_year_semester_id');
            $table->dropConstrainedForeignId('rejected_school_year_semester_id');
            $table->dropConstrainedForeignId('revoked_school_year_semester_id');
        });
    }

    public function down(): void
    {
        Schema::table('referral', function (Blueprint $table) {
            $table->foreignId('school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('confirmed_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('rejected_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('revoked_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
        });
    }
};
