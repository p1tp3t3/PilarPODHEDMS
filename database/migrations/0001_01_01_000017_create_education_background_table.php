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
        Schema::create('education_background', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('education_type');
            $table->string('school_name')->nullable();
            $table->string('school_address')->nullable();
            $table->string('year_graduated')->nullable();
            $table->string('program')->nullable();
            $table->date('date_attended')->nullable();
            $table->string('year_level')->nullable();
            $table->boolean('transferee')->default(false);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('education_background');
    }
};
