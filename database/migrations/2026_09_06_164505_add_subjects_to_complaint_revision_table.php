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
        Schema::table('complaint_revision', function (Blueprint $table) {
            $table->longText('subjects')->nullable()->after('complaint_evidences');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('complaint_revision', function (Blueprint $table) {
            $table->dropColumn('subjects');
        });
    }
};
