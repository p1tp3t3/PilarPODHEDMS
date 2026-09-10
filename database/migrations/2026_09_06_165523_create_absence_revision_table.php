<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('absence_revision', function (Blueprint $table) {
            $table->id();
            $table->foreignId('absence_id')->constrained('absent_form')->cascadeOnDelete()->cascadeOnUpdate();
            $table->json('reason');
            $table->date('date_from')->nullable();
            $table->date('date_to')->nullable();
            $table->longText('evidences')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('absence_revision');
    }
};
