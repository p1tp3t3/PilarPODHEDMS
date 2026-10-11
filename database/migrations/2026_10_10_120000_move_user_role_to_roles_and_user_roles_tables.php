<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Roles live in a roles table + a user_roles history table (users has no
 * role column), so a user's role can be changed while keeping the role they
 * registered with (is_original_role) and every later change. A user's
 * current role is their most recent user_roles row.
 *
 * Databases created before this existed still have users.role — for those,
 * each user's role is copied over as their original role and the column is
 * dropped. A fresh install never has the column, so that step is skipped.
 */
return new class extends Migration
{
    private const ROLES = [
        'super_admin' => 'IT Admin',
        'sub_admin' => 'Prefect',
        'student' => 'Student',
        'teaching_staff' => 'Teaching Staff',
        'non_teaching_staff' => 'Non-Teaching Staff',
        'parent' => 'Parent',
    ];

    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('label');
            $table->timestamps();
        });

        Schema::create('user_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('roles');
            $table->boolean('is_original_role')->default(false);
            $table->timestamps();

            $table->index(['user_id', 'id']);
        });

        $now = now();
        DB::table('roles')->insert(collect(self::ROLES)->map(fn ($label, $name) => [
            'name' => $name,
            'label' => $label,
            'created_at' => $now,
            'updated_at' => $now,
        ])->values()->all());

        if (! Schema::hasColumn('users', 'role')) {
            return;
        }

        $roleIds = DB::table('roles')->pluck('id', 'name');

        DB::table('users')->select('id', 'role', 'created_at')->orderBy('id')->chunk(500, function ($users) use ($roleIds, $now) {
            DB::table('user_roles')->insert($users->map(fn ($u) => [
                'user_id' => $u->id,
                'role_id' => $roleIds[$u->role],
                'is_original_role' => true,
                'created_at' => $u->created_at ?? $now,
                'updated_at' => $u->created_at ?? $now,
            ])->all());
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('role');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_roles');
        Schema::dropIfExists('roles');
    }
};
