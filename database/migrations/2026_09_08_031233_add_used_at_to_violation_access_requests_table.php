<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // An approved grant is single-use — the middleware consumes it (sets
        // used_at + flips status to 'used') the moment it lets the request
        // through, so it can never be exercised a second time even while
        // still inside its expires_at window.
        DB::statement("ALTER TABLE violation_access_requests MODIFY COLUMN status "
            . "ENUM('pending', 'approved', 'denied', 'expired', 'revoked', 'used') NOT NULL DEFAULT 'pending'");

        Schema::table('violation_access_requests', function (Blueprint $table) {
            $table->timestamp('used_at')->nullable()->after('revoked_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('violation_access_requests', function (Blueprint $table) {
            $table->dropColumn('used_at');
        });

        DB::statement("ALTER TABLE violation_access_requests MODIFY COLUMN status "
            . "ENUM('pending', 'approved', 'denied', 'expired', 'revoked') NOT NULL DEFAULT 'pending'");
    }
};
