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
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('id_number', 20)
                  ->nullable()
                  ->unique();
            $table->string('username')->nullable();
            $table->string('email')->nullable()->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->boolean('already_update_profile')->default(false);
            $table->boolean('already_update_password')->default(false);
            // Set when the super admin changes this user's password: the next
            // login must set a new one before anything else.
            $table->boolean('must_change_password')->default(false);
            $table->text('password')->nullable();
            $table->boolean('activate')->default(false);
            $table->dateTime('last_seen')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
