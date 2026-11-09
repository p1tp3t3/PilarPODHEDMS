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
        Schema::create('parent_registration_request', function (Blueprint $table) {
            // Primary key (auto-increment).
            $table->increments('id');
            // The parent's account, set once the request is approved and the
            // account is generated; null while pending.
            $table->foreignId('parent_id')->nullable()->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->string('name')->nullable();
            $table->string('email')->unique();
            $table->longText('parent_details')->nullable();
            $table->text('reason')->nullable();
            // The parent agreed to the Terms and Conditions when registering.
            $table->boolean('is_agreed')->default(false);
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('parent_registration_request');
    }
};
