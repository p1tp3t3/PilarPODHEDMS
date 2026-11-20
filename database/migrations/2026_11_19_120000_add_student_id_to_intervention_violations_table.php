<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Links an intervention's violation(s) to one student: a referral can
     * refer two or more students, each about their own violation(s), so a
     * link names the student it is for. Appointments and office calls have
     * one student; theirs is filled in from the record.
     *
     * Also makes intervention_type an enum (appointment | referral | call_in).
     */
    public function up(): void
    {
        Schema::table('intervention_violations', function (Blueprint $table) {
            $table->unsignedBigInteger('student_id')->nullable()->after('intervention_id');
            $table->index('student_id', 'iv_student');
        });

        // Appointments and office calls: their one student.
        DB::statement("UPDATE intervention_violations iv JOIN appointment a ON a.id = iv.intervention_id
            SET iv.student_id = a.user_id WHERE iv.intervention_type = 'appointment'");
        DB::statement("UPDATE intervention_violations iv JOIN call_in c ON c.id = iv.intervention_id
            SET iv.student_id = c.student_id WHERE iv.intervention_type = 'call_in'");

        // Referrals: each referred student keeps a link only to the
        // violations they have a resolved record of.
        $now = now();
        foreach (DB::table('intervention_violations')->where('intervention_type', 'referral')->whereNull('student_id')->get() as $link) {
            $students = DB::table('referral_referred_student')->where('referral_id', $link->intervention_id)->pluck('student_id');
            foreach ($students as $studentId) {
                $hasRecord = DB::table('complaint_subject_violation as cso')
                    ->join('complaint as c', 'c.id', '=', 'cso.complaint_id')
                    ->where('c.complaint_status', 'resolved')
                    ->where('cso.student_id', $studentId)
                    ->where('cso.violation_id', $link->violation_id)
                    ->exists();
                if ($hasRecord) {
                    DB::table('intervention_violations')->insert([
                        'intervention_type' => 'referral',
                        'intervention_id' => $link->intervention_id,
                        'student_id' => $studentId,
                        'violation_id' => $link->violation_id,
                        'created_at' => $link->created_at ?? $now,
                    ]);
                }
            }
        }
        DB::table('intervention_violations')->where('intervention_type', 'referral')->whereNull('student_id')->delete();

        Schema::table('intervention_violations', function (Blueprint $table) {
            $table->dropUnique('iv_unique');
            $table->unique(['intervention_type', 'intervention_id', 'student_id', 'violation_id'], 'iv_unique');
            $table->enum('intervention_type', ['appointment', 'referral', 'call_in'])->change();
        });
    }

    public function down(): void
    {
        // Back to one link per intervention and violation.
        $keep = DB::table('intervention_violations')
            ->groupBy('intervention_type', 'intervention_id', 'violation_id')
            ->selectRaw('MIN(id) AS id')->pluck('id');
        DB::table('intervention_violations')->whereNotIn('id', $keep)->delete();

        Schema::table('intervention_violations', function (Blueprint $table) {
            $table->dropUnique('iv_unique');
            $table->unique(['intervention_type', 'intervention_id', 'violation_id'], 'iv_unique');
            $table->dropIndex('iv_student');
            $table->dropColumn('student_id');
            $table->string('intervention_type', 20)->change();
        });
    }
};
