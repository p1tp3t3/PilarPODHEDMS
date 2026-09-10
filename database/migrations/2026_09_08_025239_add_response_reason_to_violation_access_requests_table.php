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
        Schema::table('violation_access_requests', function (Blueprint $table) {
            // The prefect's reason for denying a request — distinct from
            // `reason`, which is the super admin's reason for asking.
            $table->text('response_reason')->nullable()->after('reason');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('violation_access_requests', function (Blueprint $table) {
            $table->dropColumn('response_reason');
        });
    }
};
