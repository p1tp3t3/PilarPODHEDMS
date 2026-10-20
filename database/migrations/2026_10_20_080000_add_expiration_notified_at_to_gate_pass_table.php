<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * When the student was told their gate pass is about to expire, so the
 * scheduled reminder (app:notify-gate-pass-expiration-command) sends it
 * only once per gate pass, however often it runs.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('gate_pass', 'expiration_notified_at')) {
            return;
        }

        Schema::table('gate_pass', function (Blueprint $table) {
            $table->dateTime('expiration_notified_at')->nullable()->after('date_expiration');
        });
    }

    public function down(): void
    {
        Schema::table('gate_pass', function (Blueprint $table) {
            $table->dropColumn('expiration_notified_at');
        });
    }
};
