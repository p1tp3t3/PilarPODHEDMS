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
        // teaching_staff.position ('faculty'/'program_head') isn't a
        // non-teaching-staff position, but it's the same underlying concept
        // (an assignable label with its own row here) — seeded under the
        // same exact string values so the position_id conversion below is a
        // pure storage change, not a rename.
        foreach (['faculty', 'program_head'] as $name) {
            DB::table('positions')->insertOrIgnore([
                'name' => $name,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        Schema::table('non_teaching_staff', function (Blueprint $table) {
            $table->foreignId('position_id')->nullable()->after('position')->constrained('positions')->nullOnDelete();
        });

        Schema::table('teaching_staff', function (Blueprint $table) {
            $table->foreignId('position_id')->nullable()->after('position')->constrained('positions')->nullOnDelete();
        });

        // Backfill position_id from the existing enum string, matched by name.
        DB::statement('
            UPDATE non_teaching_staff
            JOIN positions ON positions.name = non_teaching_staff.position
            SET non_teaching_staff.position_id = positions.id
        ');

        DB::statement('
            UPDATE teaching_staff
            JOIN positions ON positions.name = teaching_staff.position
            SET teaching_staff.position_id = positions.id
        ');

        Schema::table('non_teaching_staff', function (Blueprint $table) {
            $table->dropColumn('position');
        });

        Schema::table('teaching_staff', function (Blueprint $table) {
            $table->dropColumn('position');
        });

        // Stays nullable — the FK's nullOnDelete() requires it, and
        // 'faculty'/'program_head' are protected from deletion at the
        // application level (AccountController::destroyPosition) the same
        // way Guard/Guidance already are, so it's never actually null in
        // practice.
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('non_teaching_staff', function (Blueprint $table) {
            $table->enum('position', [
                'Registrar', 'Guard', 'Guidance', 'Librarian',
                'Nurse', 'Administrative Staff', 'Maintenance Staff', 'Security Personnel',
            ])->nullable()->after('user_id');
        });

        Schema::table('teaching_staff', function (Blueprint $table) {
            $table->enum('position', ['faculty', 'program_head'])->default('faculty')->after('program_id');
        });

        DB::statement('
            UPDATE non_teaching_staff
            JOIN positions ON positions.id = non_teaching_staff.position_id
            SET non_teaching_staff.position = positions.name
        ');

        DB::statement('
            UPDATE teaching_staff
            JOIN positions ON positions.id = teaching_staff.position_id
            SET teaching_staff.position = positions.name
        ');

        Schema::table('non_teaching_staff', function (Blueprint $table) {
            $table->dropConstrainedForeignId('position_id');
        });

        Schema::table('teaching_staff', function (Blueprint $table) {
            $table->dropConstrainedForeignId('position_id');
        });
    }
};
