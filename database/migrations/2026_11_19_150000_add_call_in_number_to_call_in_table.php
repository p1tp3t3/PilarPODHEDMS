<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A call-in's reference number, like an appointment's or a referral's:
     * the date (mmddyy) and its number that day (GeneratesSequenceCode).
     * Call-ins already on record get one from their own date, in order.
     */
    public function up(): void
    {
        Schema::table('call_in', function (Blueprint $table) {
            $table->string('call_in_number', 20)->nullable()->unique()->after('id');
        });
    }

    public function down(): void
    {
        Schema::table('call_in', function (Blueprint $table) {
            $table->dropUnique(['call_in_number']);
            $table->dropColumn('call_in_number');
        });
    }
};
