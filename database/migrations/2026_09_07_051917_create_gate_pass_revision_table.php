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
        Schema::create('gate_pass_revision', function (Blueprint $table) {
            $table->id();
            // gate_pass.id is increments() (INT UNSIGNED), not bigIncrements()
            // — foreignId() defaults to BIGINT UNSIGNED and fails the FK type
            // match, so this must be spelled out explicitly.
            $table->unsignedInteger('gate_pass_id');
            $table->foreign('gate_pass_id')->references('id')->on('gate_pass')->cascadeOnDelete();
            $table->text('reason');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gate_pass_revision');
    }
};
