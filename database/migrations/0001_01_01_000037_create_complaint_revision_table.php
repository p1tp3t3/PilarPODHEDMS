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
        Schema::create('complaint_revision', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complaint_id')->constrained('complaint')->cascadeOnDelete()->cascadeOnUpdate();
            $table->text('incident')->nullable();
            $table->text('complaint_description');
            $table->longText('complaint_evidences')->nullable();
            $table->longText('subjects')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('complaint_revision');
    }
};
