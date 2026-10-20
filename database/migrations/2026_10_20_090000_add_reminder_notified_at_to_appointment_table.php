<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * When the appointed user was reminded of their upcoming appointment, so
 * app:notify-appointment-sched-command reminds them only once. Cleared
 * again when the appointment is rescheduled.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('appointment', 'reminder_notified_at')) {
            return;
        }

        Schema::table('appointment', function (Blueprint $table) {
            $table->dateTime('reminder_notified_at')->nullable()->after('date_time_appoint');
        });
    }

    public function down(): void
    {
        Schema::table('appointment', function (Blueprint $table) {
            $table->dropColumn('reminder_notified_at');
        });
    }
};
