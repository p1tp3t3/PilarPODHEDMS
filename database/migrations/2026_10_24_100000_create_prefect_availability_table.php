<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The prefect's weekly availability: one row per time range, e.g. Monday
 * 08:00–11:00 and Monday 14:00–15:00. day_of_week is 1 (Monday) … 6 (Saturday).
 * Shown to every user so they know when the prefect can be found.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('prefect_availability')) {
            return;
        }

        Schema::create('prefect_availability', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->unsignedTinyInteger('day_of_week');
            $table->time('start_time');
            $table->time('end_time');
            $table->timestamps();

            $table->index(['user_id', 'day_of_week']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prefect_availability');
    }
};
