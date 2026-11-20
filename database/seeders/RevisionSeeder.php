<?php

namespace Database\Seeders;

use App\Models\Absence;
use App\Models\AbsenceRevision;
use App\Models\Complaint;
use App\Models\ComplaintRevision;
use App\Models\ComplaintSubject;
use App\Models\User;
use Carbon\Carbon;
use Database\Factories\Concerns\GeneratesSampleFiles;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

/**
 * Revision history (each record's "Previous Version" sections and its
 * timeline), done the way ComplaintController::updateComplaint() and
 * AbsentFormController::updateAbsentForm() do it: the version before the
 * change is kept as a revision, every evidence file it had is copied into
 * previous_evidences/ (the audit trail: never deleted), and a new evidence
 * file never reuses a name.
 *
 *   - absent forms edited while pending (ComplaintSeeder already makes
 *     complaints edited while pending);
 *   - complaints and absent forms rejected (e.g. for lack of evidence),
 *     then edited and resubmitted: back to the Prefect as pending, the
 *     rejection kept on the revision, and the Prefect notified.
 *
 * Run after ComplaintSeeder and AbsenceSeeder.
 */
class RevisionSeeder extends Seeder
{
    use GeneratesSampleFiles;

    public function run(): void
    {
        $prefect = User::whereRole('sub_admin')->first();

        Absence::whereNull('confirmed_at')->whereNull('rejected_at')->whereNull('revoked_at')->whereNull('edited_at')
            ->inRandomOrder()->limit(2)->get()
            ->each(fn (Absence $a) => $this->reviseAbsence($a, false, $prefect));

        // Only a complaint its complainant filed themself, and never the
        // Prefect's own: the Prefect can't edit (or resubmit) a complaint.
        $prefectIds = User::whereRole('sub_admin')->pluck('id')->all();
        Complaint::where('complaint_status', 'rejected')->whereNull('revoked_at')->whereNull('resubmitted_at')
            ->whereNotNull('complainant_id')->whereNotIn('complainant_id', $prefectIds)->whereNull('prefect_id')
            ->inRandomOrder()->limit(2)->get()
            ->each(fn (Complaint $c) => $this->resubmitComplaint($c, $prefect));

        Absence::whereNotNull('rejected_at')->whereNull('confirmed_at')->whereNull('revoked_at')->whereNull('resubmitted_at')
            ->inRandomOrder()->limit(2)->get()
            ->each(fn (Absence $a) => $this->reviseAbsence($a, true, $prefect));
    }

    /** Copies every current evidence file into previous_evidences/ (never removed). */
    private function keepEvidence(string $folder, array $files): void
    {
        File::ensureDirectoryExists("{$folder}/previous_evidences");
        foreach ($files as $e) {
            $src = "{$folder}/evidences/{$e['file']}";
            if (File::exists($src)) {
                File::copy($src, "{$folder}/previous_evidences/{$e['file']}");
            }
        }
    }

    /** The next file number, after every name ever used (current and previous). */
    private function nextNumber(string $folder, array $files): int
    {
        $used = array_column($files, 'file');
        foreach (['evidences', 'previous_evidences'] as $dir) {
            if (File::isDirectory("{$folder}/{$dir}")) {
                $used = array_merge($used, array_map(fn ($f) => $f->getFilename(), File::files("{$folder}/{$dir}")));
            }
        }

        return 1 + max([0, ...array_map(fn ($n) => (int) strtok((string) $n, '-'), $used)]);
    }

    private function resubmitComplaint(Complaint $complaint, ?User $prefect): void
    {
        $folder = storage_path("app/private/complaints/complaint-{$complaint->complaint_number}");
        $files = json_decode($complaint->complaint_evidences ?? '[]', true) ?: [];
        $this->keepEvidence($folder, $files);

        $subjects = ComplaintSubject::where('complaint_id', $complaint->id)->with('user.profile')->get()
            ->map(fn ($s) => [
                'first_name' => $s->user?->profile?->first_name,
                'middle_name' => $s->user?->profile?->middle_name,
                'last_name' => $s->user?->profile?->last_name,
            ])->values();

        $rejectedAt = Carbon::parse($complaint->rejected_at ?? $complaint->created_at ?? now());
        $resubmittedAt = $rejectedAt->copy()->addHours(random_int(6, 48));

        ComplaintRevision::create([
            'complaint_id' => $complaint->id,
            'incident' => $complaint->violation?->violation_name,
            'complaint_description' => $complaint->complaint_description,
            'complaint_evidences' => $complaint->complaint_evidences,
            'subjects' => json_encode($subjects),
            'rejected_reason' => $complaint->rejected_reason ?? 'Lack of evidence.',
            'rejected_at' => $rejectedAt,
            'created_at' => $resubmittedAt,
        ]);

        // The fix: more evidence, and more detail.
        File::ensureDirectoryExists("{$folder}/evidences");
        $file = $this->nextNumber($folder, $files)."-{$complaint->complaint_number}.jpg";
        $this->makePlaceholderImage("{$folder}/evidences/{$file}", 'Added Evidence (Resubmitted)');
        $files[] = ['type' => 'pic', 'file' => $file];

        $complaint->update([
            'complaint_description' => $complaint->complaint_description.'<p>Added a photo of the incident and the name of a witness, as asked.</p>',
            'complaint_evidences' => json_encode($files),
            'complaint_status' => 'pending',
            'rejected_reason' => null,
            'rejected_at' => null,
            // Waiting for the Prefect again: no earlier approval stands.
            'confirmed_at' => null,
            'archived_at' => null,
            'edited_at' => $resubmittedAt,
            'resubmitted_at' => $resubmittedAt,
        ]);

        if ($prefect) {
            $this->notifyPrefect($prefect, 'complaint', $complaint->id, (int) $complaint->complainant_id,
                "complaint #{$complaint->complaint_number}", $resubmittedAt);
        }
    }

    private function reviseAbsence(Absence $absence, bool $resubmit, ?User $prefect): void
    {
        $folder = storage_path("app/private/absent-forms/absent-form-{$absence->form_number}");
        $files = json_decode($absence->evidences ?? '[]', true) ?: [];
        $this->keepEvidence($folder, $files);

        $base = Carbon::parse(($resubmit ? $absence->rejected_at : null) ?? $absence->created_at ?? now());
        $changedAt = $base->copy()->addHours(random_int(3, 30));

        AbsenceRevision::create([
            'absence_id' => $absence->id,
            'reason' => $absence->reason,
            'date_from' => $absence->date_from,
            'date_to' => $absence->date_to,
            'evidences' => $absence->evidences,
            'rejected_reason' => $resubmit ? ($absence->rejected_reason ?? 'No proof attached.') : null,
            'rejected_at' => $resubmit ? $base : null,
            'created_at' => $changedAt,
        ]);

        // An edit while pending swaps one file (the old one stays in
        // previous_evidences/); a resubmission adds the missing proof.
        if (! $resubmit && count($files) > 1) {
            $removed = array_shift($files);
            File::delete("{$folder}/evidences/{$removed['file']}");
        }
        File::ensureDirectoryExists("{$folder}/evidences");
        $file = $this->nextNumber($folder, $files)."-{$absence->form_number}.jpg";
        $this->makePlaceholderImage("{$folder}/evidences/{$file}", $resubmit ? 'Medical Certificate (Resubmitted)' : 'New Evidence After Edit');
        $files[] = ['file' => $file];

        $absence->update([
            'evidences' => json_encode($files),
            'edited_at' => $changedAt,
            ...($resubmit ? [
                'rejected_reason' => null,
                'rejected_at' => null,
                'archived_at' => null,
                'resubmitted_at' => $changedAt,
            ] : []),
        ]);

        if ($resubmit && $prefect) {
            $this->notifyPrefect($prefect, 'absent', $absence->id, (int) $absence->student_id,
                "absent form #{$absence->form_number}", $changedAt);
        }
    }

    private function notifyPrefect(User $prefect, string $type, int $recordId, int $senderId, string $what, Carbon $at): void
    {
        $sender = User::with('profile')->find($senderId);
        $name = trim(($sender?->profile?->first_name ?? '').' '.($sender?->profile?->last_name ?? '')) ?: 'Someone';
        DB::table('notification')->insert([
            'notif_type' => $type,
            'sender_id' => $senderId,
            'receiver_id' => $prefect->id,
            'content' => json_encode([
                'id' => $recordId,
                'sender_notif_message' => "You resubmitted {$what}.",
                'receiver_notif_message' => "{$name} edited and resubmitted rejected {$what} for your review.",
            ]),
            'read_since' => null,
            'created_at' => $at,
        ]);
    }
}
