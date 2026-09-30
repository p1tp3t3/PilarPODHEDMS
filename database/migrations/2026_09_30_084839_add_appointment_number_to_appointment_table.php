<?php

use App\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('appointment', function (Blueprint $table) {
            $table->string('appointment_number')->nullable()->unique()->after('id');
        });

        // Backfill existing rows with the same "{MMDDYY}{daily-seq}" format
        // GeneratesSequenceCode produces for new ones — computed against each
        // row's own created_at (not today), same convention the seeders use
        // for complaint/referral numbers on backdated rows.
        $dailyCounts = [];

        Appointment::whereNull('appointment_number')
            ->orderBy('created_at')
            ->each(function (Appointment $appointment) use (&$dailyCounts) {
                $prefix = Carbon::parse($appointment->created_at)->format('mdy');
                $dailyCounts[$prefix] = ($dailyCounts[$prefix] ?? 0) + 1;

                $appointment->update([
                    'appointment_number' => $prefix.str_pad($dailyCounts[$prefix], 2, '0', STR_PAD_LEFT),
                ]);
            });

        Schema::table('appointment', function (Blueprint $table) {
            $table->string('appointment_number')->nullable(false)->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appointment', function (Blueprint $table) {
            $table->dropColumn('appointment_number');
        });
    }
};
