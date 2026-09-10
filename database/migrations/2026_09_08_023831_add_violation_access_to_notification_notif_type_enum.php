<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::statement("ALTER TABLE notification MODIFY COLUMN notif_type ENUM("
            . "'complaint', 'referral', 'absent', 'violation', 'appointment', "
            . "'gatepass', 'call_in', 'user', 'violation_access'"
            . ")");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement("ALTER TABLE notification MODIFY COLUMN notif_type ENUM("
            . "'complaint', 'referral', 'absent', 'violation', 'appointment', "
            . "'gatepass', 'call_in', 'user'"
            . ")");
    }
};
