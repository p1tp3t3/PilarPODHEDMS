<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One group chat per program for its teaching staff. A program's group
 * exists implicitly — its messages are keyed by program_id — so there's
 * nothing to create when a program or teacher is added.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('group_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('program_id')->constrained('program')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamp('created_at')->useCurrent();

            $table->index(['program_id', 'id']);
        });

        // Where each member last read a group, for unread counts.
        Schema::create('group_message_reads', function (Blueprint $table) {
            $table->foreignId('program_id')->constrained('program')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('last_read_message_id')->default(0);

            $table->primary(['program_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('group_message_reads');
        Schema::dropIfExists('group_messages');
    }
};
