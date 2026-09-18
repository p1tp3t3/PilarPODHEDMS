<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The `report` table's only real job is recording which filters produced a
 * report (for duplicate detection / history), not tracking its file — the
 * file's name is now derived deterministically from the row's own id
 * (see GenerateReportJob::finalizeFileName / GenerateAccountStatisticsReportJob),
 * and the printed "Report No." reference on generated PDFs/exports is
 * dropped along with it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('report', function (Blueprint $table) {
            $table->dropUnique(['report_number']);
            $table->dropColumn(['report_number', 'file_name']);
        });
    }

    public function down(): void
    {
        Schema::table('report', function (Blueprint $table) {
            $table->string('report_number')->unique()->after('user_id');
            $table->string('file_name')->after('filters_hash');
        });
    }
};
