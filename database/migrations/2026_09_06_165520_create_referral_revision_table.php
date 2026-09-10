<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('referral_revision', function (Blueprint $table) {
            $table->id();
            $table->foreignId('referral_id')->constrained('referral')->cascadeOnDelete()->cascadeOnUpdate();
            $table->text('reason_description');
            $table->longText('students')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('referral_revision');
    }
};
