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
        Schema::create('school_year_semester', function (Blueprint $table) {
            $table->id();
            $table->foreignId('school_year_id')->constrained('school_year')->cascadeOnDelete();
            $table->tinyInteger('semester');
            $table->date('date_start')->nullable();
            $table->date('date_end')->nullable();
            // Set once the end-of-semester pending-cases notification has
            // been sent for this semester, so the daily check never
            // re-notifies for the same one.
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            $table->unique(['school_year_id', 'semester']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('school_year_semester');
    }
};
