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
        Schema::table('violation_access_requests', function (Blueprint $table) {
            // Nullable so the one pre-existing test request (made before
            // this requirement existed) doesn't break — the controller
            // enforces both as required on every new submission.
            $table->enum('access_type', ['add', 'edit', 'delete'])->nullable()->after('user_id');
            $table->text('reason')->nullable()->after('access_type');
        });

        DB::table('violation_access_requests')->whereNull('access_type')->update(['access_type' => 'edit']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('violation_access_requests', function (Blueprint $table) {
            $table->dropColumn(['access_type', 'reason']);
        });
    }
};
