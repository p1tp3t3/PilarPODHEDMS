<?php

use App\Models\SchoolYear;
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
            $table->boolean('is_active')->default(false);
            $table->timestamps();

            $table->unique(['school_year_id', 'semester']);
        });

        // Backfill: every existing school year gets its two semesters, with
        // the 1st semester active by default (mirrors a freshly created
        // school year starting at its 1st semester going forward).
        foreach (SchoolYear::all() as $schoolYear) {
            $schoolYear->semesters()->createMany([
                ['semester' => 1, 'is_active' => true],
                ['semester' => 2, 'is_active' => false],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('school_year_semester');
    }
};
