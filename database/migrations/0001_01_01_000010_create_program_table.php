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
        Schema::create('program', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('description');
            $table->string('logo')->nullable();
            $table->string('color_code')->nullable();
            $table->tinyInteger('is_deleted')->default(0);
            // A program with users/enrollments can't be deleted, only
            // archived: not offered for new registrations, kept for history.
            // Null = active; set = when it was archived.
            $table->timestamp('archived_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('program');
    }
};
