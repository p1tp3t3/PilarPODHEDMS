<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Where a referral was sent on to ("Send to" -> Guidance / IT Staff) and the
 * note that office writes back on it.
 *
 * sent_to: the office (a non_teaching_staff position name) it was sent to.
 * sent_at: when the prefect sent it.
 * office_note: that office's note (sanitised rich text), shown on the
 *   referral and printed on its form as the counselor's note.
 * office_note_by / office_note_at: who wrote the note and when.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('referral', function (Blueprint $table) {
            $table->string('sent_to', 50)->nullable()->after('send_to_guidance');
            $table->dateTime('sent_at')->nullable()->after('sent_to');
            $table->longText('office_note')->nullable()->after('sent_at');
            $table->foreignId('office_note_by')->nullable()->after('office_note')
                ->constrained('users')->nullOnDelete()->cascadeOnUpdate();
            $table->dateTime('office_note_at')->nullable()->after('office_note_by');
        });
    }

    public function down(): void
    {
        Schema::table('referral', function (Blueprint $table) {
            $table->dropConstrainedForeignId('office_note_by');
            $table->dropColumn(['sent_to', 'sent_at', 'office_note', 'office_note_at']);
        });
    }
};
