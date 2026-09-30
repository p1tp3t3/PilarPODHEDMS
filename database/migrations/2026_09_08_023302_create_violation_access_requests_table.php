<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * An approved grant is single-use — the middleware consumes it (sets
     * used_at + flips status to 'used') the moment it lets the request
     * through, so it can never be exercised a second time even while still
     * inside its expires_at window. Violation and penalty management are
     * gated separately — an "add" grant for violations doesn't also cover
     * adding penalties.
     */
    public function up(): void
    {
        Schema::create('violation_access_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->enum('resource', ['violation', 'penalty'])->nullable();
            $table->enum('access_type', ['add', 'edit', 'delete'])->nullable();
            $table->text('reason')->nullable();
            // The prefect's reason for denying a request — distinct from
            // `reason`, which is the super admin's reason for asking.
            $table->text('response_reason')->nullable();
            $table->enum('status', ['pending', 'approved', 'denied', 'expired', 'revoked', 'used'])->default('pending');
            $table->foreignId('responded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('responded_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            // A distinct column per transition keeps the whole timeline
            // (requested/approved/denied/revoked) readable off one row
            // without needing a separate history table.
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('denied_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('violation_access_requests');
    }
};
