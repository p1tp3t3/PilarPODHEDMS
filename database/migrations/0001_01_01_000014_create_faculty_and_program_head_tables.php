<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One table per teaching role:
     *  - faculty (faculty role): one row per faculty member, with the program they teach in;
     *  - program_head (program_head role): one row per program a head leads. A head can lead
     *    2+ programs (one row each); a program has at most one head.
     * Which table a person is in is their position, so neither needs a
     * position column. A person is in one table or the other, never both.
     */
    public function up(): void
    {
        Schema::create('faculty', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('program_id')->nullable()->constrained('program')->nullOnDelete()->cascadeOnUpdate();
        });

        Schema::create('program_head', function (Blueprint $table) {
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('program_id')->unique()->constrained('program')->cascadeOnDelete()->cascadeOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('program_head');
        Schema::dropIfExists('faculty');
    }
};
