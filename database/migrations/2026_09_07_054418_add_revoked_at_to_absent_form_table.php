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
        Schema::table('absent_form', function (Blueprint $table) {
            $table->dateTime('revoked_at')->nullable()->after('edited_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('absent_form', function (Blueprint $table) {
            $table->dropColumn('revoked_at');
        });
    }
};
