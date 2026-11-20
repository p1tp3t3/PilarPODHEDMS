<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * A rejected complaint / absent form can be edited and resubmitted once
     * (e.g. rejected for lack of evidence): it goes back to the Prefect as
     * pending. resubmitted_at marks that it was; the version that was
     * rejected is kept as a revision, with the reason it was rejected.
     */
    public function up(): void
    {
        Schema::table('complaint', function (Blueprint $table) {
            $table->timestamp('resubmitted_at')->nullable()->after('edited_at');
        });
        Schema::table('absent_form', function (Blueprint $table) {
            $table->timestamp('resubmitted_at')->nullable()->after('edited_at');
        });
        Schema::table('complaint_revision', function (Blueprint $table) {
            $table->text('rejected_reason')->nullable()->after('subjects');
            $table->timestamp('rejected_at')->nullable()->after('rejected_reason');
        });
        Schema::table('absence_revision', function (Blueprint $table) {
            $table->text('rejected_reason')->nullable()->after('evidences');
            $table->timestamp('rejected_at')->nullable()->after('rejected_reason');
        });
    }

    public function down(): void
    {
        Schema::table('complaint', fn (Blueprint $table) => $table->dropColumn('resubmitted_at'));
        Schema::table('absent_form', fn (Blueprint $table) => $table->dropColumn('resubmitted_at'));
        Schema::table('complaint_revision', fn (Blueprint $table) => $table->dropColumn(['rejected_reason', 'rejected_at']));
        Schema::table('absence_revision', fn (Blueprint $table) => $table->dropColumn(['rejected_reason', 'rejected_at']));
    }
};
