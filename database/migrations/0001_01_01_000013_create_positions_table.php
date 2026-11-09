<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Seeds the 9 non-teaching-staff position names AccountController::NON_TEACHING_STAFF_POSITIONS
     * hardcoded before this table existed. Program heads and faculty have no position
     * row: they're in the faculty or program_head table. "Guard" and "Guidance" are special —
     * several other features (gate pass verification, referral intake) key off
     * those exact position names — see AccountController::destroyPosition().
     */
    public function up(): void
    {
        Schema::create('positions', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->timestamps();
        });

        DB::table('positions')->insert(
            collect([
                'Registrar', 'Guard', 'Guidance', 'IT Staff', 'Librarian',
                'Nurse', 'Administrative Staff', 'Maintenance Staff', 'Security Personnel',
            ])->map(fn ($name) => [
                'name' => $name,
                'created_at' => now(),
                'updated_at' => now(),
            ])->all()
        );
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('positions');
    }
};
