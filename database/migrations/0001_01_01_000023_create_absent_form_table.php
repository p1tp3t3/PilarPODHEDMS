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
        Schema::create('absent_form', function (Blueprint $table) {
            $table->id();
            $table->string('form_number')->unique();
            $table->foreignId('student_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            // The prefect who issued it directly; null when the student submitted it.
            $table->foreignId('prefect_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->json('reason');
            $table->longText('evidences')->nullable();
            $table->text('note')->nullable();
            $table->longText('rejected_reason')->nullable();
            $table->dateTime('rejected_at')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->dateTime('edited_at')->nullable();
            $table->dateTime('revoked_at')->nullable();
            $table->date('date_from')->nullable();
            $table->date('date_to')->nullable();
            $table->dateTime('archived_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('absent_form');
    }
};
