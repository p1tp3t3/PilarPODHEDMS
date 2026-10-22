<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The prefect who filed a complaint on behalf of its complainant. Null when
 * the complainant filed it themselves. complainant_id stays the person the
 * complaint is from; prefect_id records which prefect actually entered it.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('complaint', 'prefect_id')) {
            return;
        }

        Schema::table('complaint', function (Blueprint $table) {
            $table->foreignId('prefect_id')->nullable()->after('complainant_id')
                ->constrained('users')->nullOnDelete()->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('complaint', function (Blueprint $table) {
            $table->dropConstrainedForeignId('prefect_id');
        });
    }
};
