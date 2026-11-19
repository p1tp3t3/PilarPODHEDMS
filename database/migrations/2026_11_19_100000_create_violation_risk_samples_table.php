<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The Early Intervention Violation Predictor's real training rows. One is
     * saved for each student + violation when the Prefect resolves a
     * complaint (ViolationRiskFeatures::recordComplaint()): the student's
     * record at that moment. will_repeat stays null until the outcome is
     * known: 1 once the same violation is recorded again within 90 days, 0
     * when the window (plus a grace period) passes without one.
     *
     * No foreign keys on purpose: a row is kept after its complaint is
     * purged (archive retention) or the student's account is removed, so the
     * model keeps learning from it.
     */
    public function up(): void
    {
        Schema::create('violation_risk_samples', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('complaint_id')->nullable()->index();
            $table->unsignedBigInteger('student_id')->index();
            $table->unsignedBigInteger('violation_id')->index();
            $table->unsignedSmallInteger('past_repeat_same_violation_count');
            $table->unsignedSmallInteger('recent_same_violation_count');
            $table->unsignedSmallInteger('months_since_last_same_violation');
            $table->unsignedTinyInteger('max_offense_level');
            $table->unsignedSmallInteger('other_violations_count');
            $table->unsignedSmallInteger('other_violations_recent_count');
            $table->unsignedSmallInteger('interventions_since_last');
            $table->unsignedTinyInteger('year_level');
            $table->dateTime('observed_at')->index();
            $table->boolean('will_repeat')->nullable();
            $table->dateTime('labelled_at')->nullable();
            $table->string('source', 20)->default('resolve'); // resolve | backfill
            $table->timestamps();

            $table->unique(['complaint_id', 'student_id', 'violation_id'], 'vrs_complaint_student_violation');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('violation_risk_samples');
    }
};
