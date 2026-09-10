<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('ALTER TABLE complaint_revision MODIFY incident TEXT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE complaint_revision MODIFY incident TEXT NOT NULL');
    }
};
