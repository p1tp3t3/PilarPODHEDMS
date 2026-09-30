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
        Schema::create('user_permissions', function (Blueprint $table) {
            $table->foreignId('user_id')->unique()->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->boolean('allow_complaint')->nullable();
            $table->boolean('allow_referral')->nullable();
            $table->boolean('allow_absent_form')->nullable();
            $table->boolean('allow_appointment')->nullable();
            $table->boolean('allow_gatepass')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('user_permissions');
    }
};
