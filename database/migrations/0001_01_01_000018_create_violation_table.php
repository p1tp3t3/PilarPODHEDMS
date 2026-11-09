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
        Schema::create('violation', function (Blueprint $table) {
            $table->id();
            $table->string('violation_name');
            $table->text('keywords')->nullable();
            $table->boolean('offense_status');
            // A violation with records (complaints) can't be deleted, only
            // archived: hidden from new complaints, kept for history.
            // Null = active; set = when it was archived.
            $table->timestamp('archived_at')->nullable();
            $table->tinyInteger('is_deleted')->default(0);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('violation');
    }
};
