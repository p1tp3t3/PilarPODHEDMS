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
        Schema::table('education_background', function (Blueprint $table) {
            $table->string('program')->nullable()->after('year_graduated');
            $table->date('date_attended')->nullable()->after('program');
            $table->string('year_level')->nullable()->after('date_attended');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('education_background', function (Blueprint $table) {
            $table->dropColumn(['program', 'date_attended', 'year_level']);
        });
    }
};
