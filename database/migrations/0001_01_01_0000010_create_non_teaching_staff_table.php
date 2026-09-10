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
        Schema::create('non_teaching_staff', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained('users')->onDelete('cascade');
            $table->enum('position', [
                'Registrar',
                'Guard',
                'Guidance',
                'Librarian',
                'Nurse',
                'Administrative Staff',
                'Maintenance Staff',
                'Security Personnel',
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('non_teaching_staff');
    }
};
