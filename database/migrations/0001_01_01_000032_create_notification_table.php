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
        Schema::create('notification', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->nullable()->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('receiver_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->enum('notif_type', [
                'complaint', 'referral', 'absent', 'violation', 'appointment',
                'gatepass', 'call_in', 'user',
                'semester_summary', 'maintenance_notice',
            ])->nullable();
            $table->text('content');
            $table->nullableMorphs('notifiable');
            $table->dateTime('read_since')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notification');
    }
};
