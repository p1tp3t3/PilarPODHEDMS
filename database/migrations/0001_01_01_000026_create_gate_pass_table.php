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
        Schema::create('gate_pass', function (Blueprint $table) {
            $table->increments('id');
            $table->string('gatepass_number')->nullable()->unique();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete()->cascadeOnUpdate();
            $table->text('reason');
            $table->text('allow_to')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->dateTime('date_expiration')->nullable();
            $table->text('rejected_reason')->nullable();
            $table->dateTime('rejected_at')->nullable();
            $table->dateTime('revoked_at')->nullable();
            $table->dateTime('edited_at')->nullable();
            $table->dateTime('archived_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->foreignId('school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('confirmed_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('rejected_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
            $table->foreignId('revoked_school_year_semester_id')->nullable()->constrained('school_year_semester')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('gate_pass');
    }
};
