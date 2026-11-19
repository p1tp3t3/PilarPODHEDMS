<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Which violation(s) an intervention addresses: an appointment, a referral
     * or an office call (call_in) can be about one or more violations. Only
     * linked interventions count toward the Early Intervention Violation
     * Predictor's training row for that violation (ViolationRiskFeatures).
     */
    public function up(): void
    {
        Schema::create('intervention_violations', function (Blueprint $table) {
            $table->id();
            $table->enum('intervention_type', ['appointment', 'referral', 'call_in']); // appointment | referral | call_in
            $table->unsignedBigInteger('intervention_id');
            $table->foreignId('violation_id')->constrained('violation')->cascadeOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['intervention_type', 'intervention_id', 'violation_id'], 'iv_unique');
            $table->index(['intervention_type', 'intervention_id'], 'iv_intervention');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('intervention_violations');
    }
};
