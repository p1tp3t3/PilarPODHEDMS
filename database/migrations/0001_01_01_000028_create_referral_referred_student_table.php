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
        Schema::create('referral_referred_student', function (Blueprint $table) {
            $table->foreignId('referral_id')->constrained('referral')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('student_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('referral_referred_student');
    }
};
