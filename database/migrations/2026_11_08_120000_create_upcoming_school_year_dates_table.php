<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Planned semester dates for the upcoming school year, set before it's
     * added (it's only stored in school_year once the current one ends).
     * Its 1st Sem always starts the day after the latest school year ends
     * and its 2nd Sem the day after its 1st Sem ends, so only the two end
     * dates are kept. Used, then removed, when the school year is added.
     */
    public function up(): void
    {
        Schema::create('upcoming_school_year_dates', function (Blueprint $table) {
            $table->string('year')->primary();
            $table->date('first_sem_end');
            $table->date('second_sem_end');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('upcoming_school_year_dates');
    }
};
