<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The prefect who filed a referral on behalf of its referrer (a teacher).
 * Null when the referrer filed it themselves, or when the prefect is the
 * referrer. Same idea as complaint.prefect_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('referral', 'prefect_id')) {
            return;
        }

        Schema::table('referral', function (Blueprint $table) {
            $table->foreignId('prefect_id')->nullable()->after('teaching_staff_id')
                ->constrained('users')->nullOnDelete()->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::table('referral', function (Blueprint $table) {
            $table->dropConstrainedForeignId('prefect_id');
        });
    }
};
