<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tags every submitted request with the semester that was active at the
     * time it was created — nullable since existing rows predate this
     * column and there's no reliable way to backfill which semester was
     * "active" back when they were submitted.
     */
    private const TABLES = ['complaint', 'referral', 'absent_form', 'appointment', 'gate_pass', 'notification'];

    public function up(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->foreignId('school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach (self::TABLES as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropForeign(['school_year_semester_id']);
                $blueprint->dropColumn('school_year_semester_id');
            });
        }
    }
};
