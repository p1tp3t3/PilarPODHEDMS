<?php

use App\Models\Position;
use App\Models\TeachingStaff;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A program head can now handle 2+ programs (previously a strict 1:1
     * via teaching_staff.program_id). This pivot becomes the single source
     * of truth for every program a head is responsible for — including
     * their original/primary one, backfilled below — so
     * Program::programHead() only ever has to look in one place instead of
     * also special-casing teaching_staff.program_id.
     *
     * teaching_staff.program_id itself is untouched: it still doubles as
     * the person's "home" program for faculty-grouping/display purposes,
     * independent of how many programs they head.
     */
    public function up(): void
    {
        Schema::create('program_head_program', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('program_id')->constrained('program')->cascadeOnDelete();
            $table->timestamps();

            // One head per program (preserves the existing "this program
            // already has a head" registration rule) — a user_id may repeat
            // across rows, a program_id may not.
            $table->unique('program_id');
        });

        $programHeadPositionId = Position::idFor('program_head');

        if ($programHeadPositionId) {
            TeachingStaff::where('position_id', $programHeadPositionId)
                ->whereNotNull('program_id')
                ->get(['user_id', 'program_id'])
                ->each(function ($head) {
                    \DB::table('program_head_program')->insertOrIgnore([
                        'user_id' => $head->user_id,
                        'program_id' => $head->program_id,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('program_head_program');
    }
};
