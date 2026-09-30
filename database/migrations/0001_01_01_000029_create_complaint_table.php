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
        Schema::create('complaint', function (Blueprint $table) {
            $table->id();
            $table->string('complaint_number')->unique();
            $table->integer('case_number')->nullable();
            $table->string('complainant_name')->nullable();
            $table->foreignId('complainant_id')->nullable()->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('incident_id')->nullable()->constrained('violation')->nullOnDelete()->cascadeOnUpdate();
            $table->text('complaint_description');
            // One complaint can have 2+ complainees, but the prefect's
            // narrative of what happened is a single account of the incident
            // — kept once per complaint rather than per-complainee.
            $table->text('incident_summary')->nullable();
            $table->longText('complaint_evidences')->nullable();
            $table->longText('rejected_reason')->nullable();
            $table->dateTime('rejected_at')->nullable();
            $table->dateTime('revoked_at')->nullable();
            // Tracks whether the complainant has already used their one
            // allowed edit on this complaint — null means never edited.
            $table->dateTime('edited_at')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->dateTime('offense_issued_at')->nullable();
            // Nullable because the enum was widened via a raw MODIFY
            // statement (to add 'revoked') that omitted NOT NULL, which
            // silently dropped the not-null constraint MySQL side.
            $table->enum('complaint_status', ['rejected', 'pending', 'ongoing', 'resolved', 'revoked'])->nullable()->default('pending');
            $table->dateTime('resolved_at')->nullable();
            $table->dateTime('archived_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreignId('school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('confirmed_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('resolved_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('rejected_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('revoked_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('complaint');
    }
};
