<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * teaching_staff_id: the referrer on a referral is any teaching staff
     * member (faculty included), not only program heads — originally named
     * program_head_id.
     */
    public function up(): void
    {
        Schema::create('referral', function (Blueprint $table) {
            $table->id();
            $table->string('referral_number')->unique();
            $table->foreignId('teaching_staff_id')->constrained('users', 'id', 'referral_program_head_id_foreign')->restrictOnDelete()->cascadeOnUpdate();
            // The prefect who filed it for the referrer; null when the referrer filed it.
            $table->foreignId('prefect_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->longText('reason_description');
            // Nullable because the enum was widened via a raw MODIFY
            // statement (to add 'revoked') that omitted NOT NULL, which
            // silently dropped the not-null constraint MySQL side.
            $table->enum('referral_status', ['pending', 'rejected', 'approved', 'revoked'])->nullable()->default('pending');
            $table->longText('rejected_reason')->nullable();
            $table->tinyInteger('send_to_guidance')->nullable();
            $table->dateTime('rejected_at')->nullable();
            $table->dateTime('revoked_at')->nullable();
            $table->dateTime('edited_at')->nullable();
            $table->dateTime('confirmed_at')->nullable();
            $table->dateTime('archived_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('referral');
    }
};
