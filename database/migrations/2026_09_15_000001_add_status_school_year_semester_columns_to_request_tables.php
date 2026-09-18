<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The existing school_year_semester_id column only tags a request with
     * the semester it was FILED in. Confirm/reject/revoke (and resolve, for
     * complaints) each happen at their own later moment, potentially in a
     * different semester — these columns let each transition remember its
     * own tag instead of all sharing the filing-time one.
     */
    private const TABLES_WITH_RESOLVE = ['complaint'];
    private const TABLES = ['complaint', 'referral', 'absent_form', 'gate_pass'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->foreignId('confirmed_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();

                if (in_array($table, self::TABLES_WITH_RESOLVE, true)) {
                    $blueprint->foreignId('resolved_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
                }

                $blueprint->foreignId('rejected_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
                $blueprint->foreignId('revoked_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->dropForeign(['confirmed_school_year_semester_id']);
                $blueprint->dropColumn('confirmed_school_year_semester_id');

                if (in_array($table, self::TABLES_WITH_RESOLVE, true)) {
                    $blueprint->dropForeign(['resolved_school_year_semester_id']);
                    $blueprint->dropColumn('resolved_school_year_semester_id');
                }

                $blueprint->dropForeign(['rejected_school_year_semester_id']);
                $blueprint->dropColumn('rejected_school_year_semester_id');
                $blueprint->dropForeign(['revoked_school_year_semester_id']);
                $blueprint->dropColumn('revoked_school_year_semester_id');
            });
        }
    }
};
