<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Violation and penalty management are gated separately — an "add"
        // grant for violations doesn't also cover adding penalties.
        Schema::table('violation_access_requests', function (Blueprint $table) {
            $table->enum('resource', ['violation', 'penalty'])->nullable()->after('user_id');
        });

        DB::table('violation_access_requests')->whereNull('resource')->update(['resource' => 'violation']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('violation_access_requests', function (Blueprint $table) {
            $table->dropColumn('resource');
        });
    }
};
