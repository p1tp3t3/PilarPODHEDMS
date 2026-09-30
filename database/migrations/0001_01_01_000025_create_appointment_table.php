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
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            $table->dateTime('date_time_appoint')->nullable();
            $table->enum('appointment_status', ['pending', 'rejected', 'accepted'])->default('pending');
            $table->enum('attendance_status', ['not_marked', 'present', 'absent'])->default('not_marked');
            $table->text('rejected_reason')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->text('description');
            $table->dateTime('archived_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreignId('school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
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
