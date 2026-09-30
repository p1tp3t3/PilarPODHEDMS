<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Direct 1:1 messages. Every user can message sub_admin/super_admin,
     * and sub_admin/super_admin can message anyone back (including each
     * other) — enforced in ChatController, not here. No group threads, so
     * a "conversation" is just every row between two given user ids.
     */
    public function up(): void
    {
        Schema::create('message', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('receiver_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreignId('reply_to_id')->nullable()->constrained('message')->nullOnDelete()->cascadeOnUpdate();
            $table->text('body');
            // "Unsend" is a soft delete (body kept, just hidden) rather than
            // a real row delete — so reply_to references from the other
            // side stay intact and can render an "unsent" placeholder.
            $table->dateTime('unsent_at')->nullable();
            // message.body always holds the CURRENT text; every time it's
            // edited, the text it had right before the edit is archived
            // into message_edit so both sides can look back at prior
            // versions instead of the history just being overwritten.
            $table->dateTime('edited_at')->nullable();
            $table->dateTime('read_at')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['sender_id', 'receiver_id']);
            $table->index(['receiver_id', 'read_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message');
    }
};
