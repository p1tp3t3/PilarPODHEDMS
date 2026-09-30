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
        Schema::create('violation_penalty', function (Blueprint $table) {
            $table->foreignId('violation_id')->constrained('violation')->cascadeOnDelete()->cascadeOnUpdate();
            $table->integer('occurrence');
            $table->foreignId('penalty_id')->constrained('penalty')->cascadeOnDelete()->cascadeOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('violation_penalty');
    }
};
