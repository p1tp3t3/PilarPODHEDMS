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
        Schema::table('gate_pass', function (Blueprint $table) {
            $table->text('rejected_reason')->nullable()->after('date_expiration');
            $table->dateTime('rejected_at')->nullable()->after('rejected_reason');
            $table->dateTime('revoked_at')->nullable()->after('rejected_at');
            $table->dateTime('edited_at')->nullable()->after('revoked_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gate_pass', function (Blueprint $table) {
            $table->dropColumn(['rejected_reason', 'rejected_at', 'revoked_at', 'edited_at']);
        });
    }
};
