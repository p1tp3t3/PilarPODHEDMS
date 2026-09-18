<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A saved, reusable report filter preset (date range or school year+semester,
 * plus program/individual/type/file-type) — created from the same form that
 * used to generate a report immediately (GenerateReportModal). Generating
 * is now a separate step (ReportController::generateFromFilter), so the
 * same filter can be re-run later without retyping it, edited, or deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report_filter', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('report_type', 25);
            $table->string('name');
            $table->json('filters');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report_filter');
    }
};
