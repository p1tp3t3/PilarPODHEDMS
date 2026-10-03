<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Never read by the frontend — the "semester_summary" notification already
 * embeds a human-readable label/counts in its own content JSON
 * (NotifyUnresolvedCasesCommand), so this tag was redundant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('notification', function (Blueprint $table) {
            $table->dropConstrainedForeignId('school_year_semester_id');
        });
    }

    public function down(): void
    {
        Schema::table('notification', function (Blueprint $table) {
            $table->foreignId('school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
        });
    }
};
