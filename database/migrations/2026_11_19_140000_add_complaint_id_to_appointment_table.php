<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The complaint an appointment was set from (the complaint's Intervene
     * button, before its violation verdict): null for every other
     * appointment. The Interventions page lists these under Complaints.
     */
    public function up(): void
    {
        Schema::table('appointment', function (Blueprint $table) {
            $table->foreignId('complaint_id')->nullable()->after('user_id')
                ->constrained('complaint')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('appointment', function (Blueprint $table) {
            $table->dropConstrainedForeignId('complaint_id');
        });
    }
};
