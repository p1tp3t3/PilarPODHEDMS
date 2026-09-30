<?php

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
        Schema::create('appointment_student', function (Blueprint $table) {
            $table->unsignedInteger('appointment_id');
            $table->foreign('appointment_id')->references('id')->on('appointment')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('student_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointment_student');
    }
};
