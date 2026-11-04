<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The roles a user can have. A user's role history lives in user_roles
 * (users has no role column).
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
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        $now = now();
        DB::table('roles')->insert(collect(self::ROLES)->map(fn ($label, $name) => [
            'name' => $name,
            'label' => $label,
            'created_at' => $now,
            'updated_at' => $now,
        ])->values()->all());
    }

    public function down(): void
    {
        Schema::dropIfExists('roles');
    }
};
