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
        // `responded_at` only ever held the most recent transition — once a
        // request went approved then later revoked, the approval's own
        // timestamp was overwritten and lost. A distinct column per
        // transition keeps the whole timeline (requested/approved/
        // denied/revoked) readable off one row without needing a separate
        // history table.
        Schema::table('violation_access_requests', function (Blueprint $table) {
            $table->timestamp('approved_at')->nullable()->after('expires_at');
            $table->timestamp('denied_at')->nullable()->after('approved_at');
            $table->timestamp('revoked_at')->nullable()->after('denied_at');
        });

        DB::table('violation_access_requests')->where('status', 'approved')->update(['approved_at' => DB::raw('responded_at')]);
        DB::table('violation_access_requests')->where('status', 'denied')->update(['denied_at' => DB::raw('responded_at')]);
        DB::table('violation_access_requests')->where('status', 'revoked')->update(['revoked_at' => DB::raw('responded_at')]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('violation_access_requests', function (Blueprint $table) {
            $table->dropColumn(['approved_at', 'denied_at', 'revoked_at']);
        });
    }
};
