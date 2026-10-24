<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Access the prefect gives can be limited to a number of uses (e.g. "add a
 * violation, 3 times"). max_uses null = unlimited until it expires.
 * uses_count counts the successful changes made with it.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('violation_access_requests', 'max_uses')) {
            return;
        }

        Schema::table('violation_access_requests', function (Blueprint $table) {
            $table->unsignedSmallInteger('max_uses')->nullable()->after('expires_at');
            $table->unsignedSmallInteger('uses_count')->default(0)->after('max_uses');
        });
    }

    public function down(): void
    {
        Schema::table('violation_access_requests', function (Blueprint $table) {
            $table->dropColumn(['max_uses', 'uses_count']);
        });
    }
};
