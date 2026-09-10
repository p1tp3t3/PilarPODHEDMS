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
        Schema::table('enrollment', function (Blueprint $table) {
            $table->foreignId('school_year_id')->nullable()->after('program_id')
                  ->constrained('school_year')->restrictOnDelete()->cascadeOnUpdate();
        });

        // Backfill: create one school_year row per distinct existing string
        // value, then point every matching enrollment row at it.
        $years = DB::table('enrollment')->select('school_year')->distinct()->pluck('school_year');
        foreach ($years as $year) {
            $id = DB::table('school_year')->insertGetId([
                'year' => $year,
                'activate' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            DB::table('enrollment')->where('school_year', $year)->update(['school_year_id' => $id]);
        }

        // Give the migrated data a sane default "current" year so the app
        // isn't left with zero active school years.
        $latest = DB::table('school_year')->orderByDesc('year')->first();
        if ($latest) {
            DB::table('school_year')->where('id', $latest->id)->update(['activate' => true]);
        }

        // No doctrine/dbal in this project, so enforce NOT NULL with a raw
        // statement (same precedent as the CHECK constraints already used in
        // the enrollment table's own migration) rather than Blueprint's ->change().
        DB::statement('ALTER TABLE enrollment MODIFY school_year_id BIGINT UNSIGNED NOT NULL');

        Schema::table('enrollment', function (Blueprint $table) {
            $table->dropColumn('school_year');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enrollment', function (Blueprint $table) {
            $table->string('school_year')->nullable()->after('program_id');
        });

        DB::table('enrollment')->orderBy('id')->each(function ($row) {
            $year = DB::table('school_year')->where('id', $row->school_year_id)->value('year');
            DB::table('enrollment')->where('id', $row->id)->update(['school_year' => $year]);
        });

        DB::statement('ALTER TABLE enrollment MODIFY school_year VARCHAR(255) NOT NULL');

        Schema::table('enrollment', function (Blueprint $table) {
            $table->dropForeign(['school_year_id']);
            $table->dropColumn('school_year_id');
        });
    }
};
