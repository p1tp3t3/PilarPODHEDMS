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
        Schema::create('call_in', function (Blueprint $table) {
            $table->id();
            $table->foreignId('student_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            $table->foreignId('issued_by')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            $table->dateTime('date_time_call_in')->nullable();
            $table->text('reason');
            $table->enum('call_in_status', ['pending', 'rejected', 'accepted'])->default('pending');
            $table->text('rejected_reason')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('call_in');
    }
};
