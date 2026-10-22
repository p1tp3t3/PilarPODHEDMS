<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The prefect who issued an absent form / gate pass directly to a student.
 * Null when the student submitted (absent form) or requested (gate pass) it
 * themselves. Same idea as complaint.prefect_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        foreach (['absent_form' => 'student_id', 'gate_pass' => 'user_id'] as $table => $after) {
            if (Schema::hasColumn($table, 'prefect_id')) {
                continue;
            }

            Schema::table($table, function (Blueprint $t) use ($after) {
                $t->foreignId('prefect_id')->nullable()->after($after)
                    ->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            });
        }
    }

    public function down(): void
    {
        foreach (['absent_form', 'gate_pass'] as $table) {
            Schema::table($table, function (Blueprint $t) {
                $t->dropConstrainedForeignId('prefect_id');
            });
        }
    }
};
