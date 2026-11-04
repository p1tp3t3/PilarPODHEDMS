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
        Schema::create('appointment', function (Blueprint $table) {
            $table->increments('id');
            $table->string('appointment_number')->unique();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            $table->dateTime('date_time_appoint')->nullable();
            // Set once the reminder is sent; cleared when rescheduled.
            $table->dateTime('reminder_notified_at')->nullable();
            $table->enum('appointment_status', ['pending', 'rejected', 'accepted'])->default('pending');
            $table->enum('attendance_status', ['not_marked', 'present', 'absent'])->default('not_marked');
            $table->text('rejected_reason')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->text('description');
            $table->dateTime('archived_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointment');
    }
};
