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
        Schema::create('enrollment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('program_id')->constrained('program')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('school_year_id')->constrained('school_year')->restrictOnDelete()->cascadeOnUpdate();
            $table->unsignedTinyInteger('semester');
            $table->unsignedTinyInteger('year_level');
            $table->enum('status', ['enrolled', 'dropped'])->default('enrolled');
            $table->date('enrolled_at');
            $table->date('dropped_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });

        DB::statement('ALTER TABLE enrollment ADD CONSTRAINT enrollment_semester_check CHECK (semester BETWEEN 1 AND 2)');
        DB::statement('ALTER TABLE enrollment ADD CONSTRAINT enrollment_year_level_check CHECK (year_level BETWEEN 1 AND 4)');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('enrollment');
    }
};
