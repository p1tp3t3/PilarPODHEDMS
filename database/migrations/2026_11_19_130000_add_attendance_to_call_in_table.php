<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Whether the student came to the office for a call-in, marked by the
     * Prefect (like an appointment's attendance). Only a call-in the student
     * attended (present) counts as an intervention.
     */
    public function up(): void
    {
        Schema::table('call_in', function (Blueprint $table) {
            $table->enum('attendance_status', ['not_marked', 'present', 'absent'])->default('not_marked')->after('call_in_status');
            $table->timestamp('attendance_marked_at')->nullable()->after('attendance_status');
        });
    }

    public function down(): void
    {
        Schema::table('call_in', function (Blueprint $table) {
            $table->dropColumn(['attendance_status', 'attendance_marked_at']);
        });
    }
};
