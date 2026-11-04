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
            // The prefect who issued it directly; null when the student requested it.
            $table->foreignId('prefect_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->text('reason');
            $table->text('allow_to')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->dateTime('date_expiration')->nullable();
            // Set once the about-to-expire notice is sent, so it goes out only once.
            $table->dateTime('expiration_notified_at')->nullable();
            $table->text('rejected_reason')->nullable();
            $table->dateTime('rejected_at')->nullable();
            $table->dateTime('revoked_at')->nullable();
            $table->dateTime('edited_at')->nullable();
            $table->dateTime('archived_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
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
