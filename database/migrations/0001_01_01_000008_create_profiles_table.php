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
        Schema::create('profiles', function (Blueprint $table) {
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('first_name');
            $table->string('middle_name')
                  ->nullable();
            $table->string('last_name');
            $table->string('suffix')
                  ->nullable();
            $table->string('profile_picture')->nullable();
            $table->enum('sex', ['m', 'f'])->nullable();
            $table->date('date_of_birth')->nullable();
            $table->string('civil_status')->nullable();
            $table->string('religion')->nullable();
            $table->string('citizenship')->nullable();
            $table->string('current_address')->nullable();
            $table->string('permanent_address')->nullable();
            $table->string('place_of_birth')->nullable();
            $table->string('contact_number', 11)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('profiles');
    }
};
