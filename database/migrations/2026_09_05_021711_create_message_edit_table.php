<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Messenger-style edit history: every time message.body is edited, the
     * text it had right before the edit is archived here so both sides can
     * look back at prior versions instead of the history being overwritten.
     */
    public function up(): void
    {
        Schema::create('message_edit', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('message')->cascadeOnDelete()->cascadeOnUpdate();
            $table->text('body');
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_edit');
    }
};
