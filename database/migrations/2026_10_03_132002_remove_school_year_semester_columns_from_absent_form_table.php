<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which semester an absent form belongs to is now derived from its own
 * timestamps (created_at/confirmed_at/rejected_at/revoked_at) against
 * school_year_semester's date_start/date_end ranges instead of being
 * stored as a separate foreign key (see Absence::schoolYearSemester() and
 * friends via HasDerivedSchoolYearSemester).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('absent_form', function (Blueprint $table) {
            $table->dropConstrainedForeignId('school_year_semester_id');
            $table->dropConstrainedForeignId('confirmed_school_year_semester_id');
            $table->dropConstrainedForeignId('rejected_school_year_semester_id');
            $table->dropConstrainedForeignId('revoked_school_year_semester_id');
        });
    }

    public function down(): void
    {
        Schema::table('absent_form', function (Blueprint $table) {
            $table->foreignId('school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('confirmed_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('rejected_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('revoked_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
        });
    }
};
