<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A violation's Word2Vec embedding (python-api/model_training/complaint_context_analyzer.py)
 * was only ever averaged from its short title — a weak signal against a full
 * complaint paragraph. This lets an admin attach representative keywords
 * per violation, synced to the Python API the same way violation_name
 * already is, so the embedding is averaged over both.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('violation', function (Blueprint $table) {
            $table->text('keywords')->nullable()->after('violation_name');
        });
    }

    public function down(): void
    {
        Schema::table('violation', function (Blueprint $table) {
            $table->dropColumn('keywords');
        });
    }
};
