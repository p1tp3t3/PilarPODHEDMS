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
        Schema::table('gate_pass', function (Blueprint $table) {
            $table->string('gatepass_number')->nullable()->unique()->after('id');
        });

        // Backfill existing rows using the same mdy + sequence format as
        // GeneratesSequenceCode, keyed off each row's own created_at (not
        // now()) so historical numbers stay meaningful.
        $counts = [];
        foreach (DB::table('gate_pass')->orderBy('id')->get() as $row) {
            $prefix = \Carbon\Carbon::parse($row->created_at)->format('mdy');
            $counts[$prefix] = ($counts[$prefix] ?? 0) + 1;
            $number = $prefix . str_pad($counts[$prefix], 2, '0', STR_PAD_LEFT);

            DB::table('gate_pass')->where('id', $row->id)->update(['gatepass_number' => $number]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gate_pass', function (Blueprint $table) {
            $table->dropColumn('gatepass_number');
        });
    }
};
