<?php

namespace App\Console\Commands;

use App\Models\Absence;
use App\Models\Complaint;
use App\Models\GatePass;
use App\Models\Notifications;
use App\Models\Referral;
use App\Models\SchoolYearSemester;
use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('app:notify-unresolved-cases-command')]
#[Description('Notifies every prefect of any still-pending/unresolved complaints, referrals, absent forms, and gate passes left over once a semester ends.')]
class NotifyUnresolvedCasesCommand extends Command
{
    /**
     * Runs daily; only semesters whose date_end was yesterday and that
     * haven't been checked yet actually do anything, so this stays a no-op
     * on every other day.
     */
    public function handle(): void
    {
        $semesters = SchoolYearSemester::with('schoolYear')
            ->whereDate('date_end', now()->subDay()->toDateString())
            ->whereNull('notified_at')
            ->get();

        if ($semesters->isEmpty()) {
            $this->info('No semester ended yesterday — nothing to check.');

            return;
        }

        foreach ($semesters as $semester) {
            $this->notifyForSemester($semester);
        }
    }

    private function notifyForSemester(SchoolYearSemester $semester): void
    {
        $counts = [
            'complaint' => Complaint::where('school_year_semester_id', $semester->id)
                ->whereIn('complaint_status', ['pending', 'ongoing'])
                ->count(),
            'referral' => Referral::where('school_year_semester_id', $semester->id)
                ->where('referral_status', 'pending')
                ->count(),
            'absent form' => Absence::where('school_year_semester_id', $semester->id)
                ->whereNull('confirmed_at')->whereNull('rejected_at')->whereNull('revoked_at')
                ->count(),
            'gate pass' => GatePass::where('school_year_semester_id', $semester->id)
                ->whereNull('confirmed_at')->whereNull('rejected_at')->whereNull('revoked_at')
                ->count(),
        ];

        $total = array_sum($counts);
        $label = "{$semester->schoolYear->year} — ".($semester->semester === 1 ? '1st' : '2nd').' Semester';

        if ($total > 0) {
            $breakdown = collect($counts)
                ->filter(fn ($count) => $count > 0)
                ->map(fn ($count, $type) => "{$count} {$type}".($count === 1 ? '' : 's'))
                ->implode(', ');

            $message = "{$label} has ended with unresolved cases still pending: {$breakdown}.";

            foreach (User::where('role', 'sub_admin')->get() as $prefect) {
                notify_single_user(
                    [
                        'sender_id' => null,
                        'receiver_id' => $prefect->id,
                        'notif_type' => 'semester_summary',
                        'content' => json_encode([
                            'sender_notif_message' => $message,
                            'receiver_notif_message' => $message,
                            'label' => $label,
                            'counts' => $counts,
                        ]),
                        'school_year_semester_id' => $semester->id,
                    ],
                    [
                        'title' => 'Semester Ended — Unresolved Cases',
                        'body' => $message,
                        'url' => '',
                        'icon' => '',
                    ]
                );
            }

            $this->info("Notified prefects about {$label}'s {$total} unresolved case(s).");
        } else {
            $this->info("{$label} ended with no unresolved cases.");
        }

        $semester->update(['notified_at' => now()]);
    }
}
