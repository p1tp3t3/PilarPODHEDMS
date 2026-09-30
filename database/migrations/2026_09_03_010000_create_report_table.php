<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Backs the previously-dead App\Models\Report (it pointed at a table that
 * was never migrated). Persists what GenerateReportJob produces so the
 * prefect can browse/re-download past reports instead of regenerating the
 * same thing — filters_hash lets the frontend check for a duplicate before
 * dispatching a new job. The file itself isn't tracked here — its name is
 * derived deterministically from the row's own id (see
 * GenerateReportJob::finalizeFileName / GenerateAccountStatisticsReportJob).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('report', function (Blueprint $table) {
            $table->id();
            // Not prefect-specific — super_admin can generate reports too.
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('report_name');
            $table->string('report_type');
            $table->string('file_type');
            $table->json('filters')->nullable();
            $table->string('filters_hash', 32)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'filters_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('report');
    }
};
