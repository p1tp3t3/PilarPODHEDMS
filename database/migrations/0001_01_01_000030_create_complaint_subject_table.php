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
        Schema::create('complaint_subject', function (Blueprint $table) {
            $table->foreignId('complaint_id')->constrained('complaint')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('student_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            $table->text('incident_summary')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('complaint_subject');
    }
};
