<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Every ID number a user has had (one user → many ID numbers). A student
 * who later becomes teaching/non-teaching staff gets a new staff ID, and
 * the student ID stays here as history instead of being overwritten.
 * users.id_number keeps holding the current one; the current row here is
 * the one with ended_at = null.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('user_id_numbers')) {
            return;
        }

        Schema::create('user_id_numbers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->string('id_number', 50);
            // The role this ID was used for.
            $table->foreignId('role_id')->nullable()->constrained('roles')->nullOnDelete()->cascadeOnUpdate();
            $table->timestamp('started_at')->useCurrent();
            $table->timestamp('ended_at')->nullable();
            $table->index(['user_id', 'ended_at']);
            $table->index('id_number');
        });

        // Backfill: each existing user's current ID, under their current role.
        $currentRoles = DB::table('user_roles as ur')
            ->whereRaw('ur.id = (select max(ur2.id) from user_roles as ur2 where ur2.user_id = ur.user_id)')
            ->select('ur.user_id', 'ur.role_id');

        DB::table('users as u')
            ->leftJoinSub($currentRoles, 'cr', 'cr.user_id', '=', 'u.id')
            ->whereNotNull('u.id_number')
            ->where('u.id_number', '!=', '')
            ->select('u.id', 'u.id_number', 'u.created_at', 'cr.role_id')
            ->orderBy('u.id')
            ->chunk(500, function ($users) {
                DB::table('user_id_numbers')->insert($users->map(fn ($u) => [
                    'user_id' => $u->id,
                    'id_number' => $u->id_number,
                    'role_id' => $u->role_id,
                    'started_at' => $u->created_at ?? now(),
                    'ended_at' => null,
                ])->all());
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_id_numbers');
    }
};
