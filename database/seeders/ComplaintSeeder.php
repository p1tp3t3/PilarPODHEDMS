<?php

namespace Database\Seeders;

use App\Http\Controllers\Modules\Complaint\ComplaintController;
use App\Models\Complaint;
use App\Models\ComplaintRevision;
use App\Models\ComplaintSubject;
use App\Models\ComplaintSubjectViolation;
use App\Models\User;
use App\Models\Violation;
use Barryvdh\DomPDF\Facade\Pdf;
use Database\Factories\Concerns\GeneratesSampleFiles;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\File;

class ComplaintSeeder extends Seeder
{
    use GeneratesSampleFiles;

    public function run(int $count = 40): void
    {
        $students = User::where('role', 'student')->pluck('id')->all();

        if (count($students) < 2) {
            $this->command?->warn('ComplaintSeeder skipped: needs at least 2 students (run StudentSeeder first).');
            return;
        }

        for ($i = 0; $i < $count; $i++) {
            $complaint = Complaint::factory()->create();

            // Subject(s): 1-2 students, always different from the complainant.
            $candidates = array_values(array_diff($students, [$complaint->complainant_id]));
            shuffle($candidates);
            $subjectIds = array_slice($candidates, 0, random_int(1, 2));

            $this->attachSubjects($complaint, $subjectIds);
            $this->generateDocument($complaint);
        }

        // Repeat offenders: a handful of students who each committed the SAME
        // violation multiple times across a realistic mix of recency
        // patterns (escalating/all-recent, long-dormant, reactivated after
        // a gap, etc — see seedRepeatOffenders()), resolved. Without this,
        // no student ever has more than one
        // resolved occurrence of a given violation (every complaint above
        // draws an independent random violation), so
        // past_repeat_same_violation_count/months_since_last_same_violation/
        // etc are 0 for literally everyone and the ML behavioural analysis
        // has nothing to show but "not enough data" or a flat "unlikely"
        // verdict.
        $this->seedRepeatOffenders($students);

        // A handful of already-edited complaints, so the "Previous Version"
        // revision-history UI has real demo data — mirrors exactly what
        // ComplaintController::updateComplaint() does for a real edit
        // (previous_evidences/ snapshot + complaint_revision row).
        for ($i = 0; $i < min(3, intdiv($count, 10) + 1); $i++) {
            $this->seedEditedComplaint($students);
        }
    }

    private function attachSubjects(Complaint $complaint, array $subjectIds): void
    {
        foreach ($subjectIds as $studentId) {
            ComplaintSubject::factory()->create([
                'complaint_id' => $complaint->id,
                'student_id' => $studentId,
            ]);

            // A resolved complaint has a formally-determined offense per subject.
            if ($complaint->complaint_status === 'resolved') {
                ComplaintSubjectViolation::factory()->create([
                    'complaint_id' => $complaint->id,
                    'student_id' => $studentId,
                    'violation_id' => $complaint->incident_id,
                ]);
            }
        }
    }

    // One form per complaint, covering every subject together — only
    // generated once resolved, matching the real app
    // (ViolationController::multipleViolationStore()).
    private function generateDocument(Complaint $complaint): void
    {
        if ($complaint->complaint_status !== 'resolved') {
            return;
        }

        $resolved = Complaint::with(['user.profile', 'complaintSubject.user.profile'])->find($complaint->id);
        $field = (new ComplaintController())->getComplaintDocumentField($resolved, $complaint->incident_summary);

        $folder = storage_path("app/private/complaints/complaint-{$complaint->complaint_number}");
        File::ensureDirectoryExists($folder);

        Pdf::loadView('pdf.complaint-subject', $field)
            ->save("{$folder}/complaint-{$complaint->complaint_number}.pdf");
    }

    private function seedRepeatOffenders(array $students): void
    {
        $violationIds = Violation::inRandomOrder()->limit(3)->pluck('id')->all();

        if (empty($violationIds)) {
            return;
        }

        $repeatStudents = array_slice($students, 0, min(5, count($students)));

        // Each profile is a list of [monthsBack, occurrenceCount] clusters
        // (oldest first). The model's "recent" window is 90 days (~3
        // months), so these are deliberately built to land clearly inside
        // or outside it — giving past_repeat_same_violation_count,
        // recent_same_violation_count and months_since_last_same_violation
        // real variance across the seeded demo data instead of every
        // repeat offender always looking "currently escalating" (every
        // occurrence recent, recent == past every time).
        $profiles = [
            [[2, 3], [1, 3]],          // escalating: all 6 occurrences recent
            [[8, 3], [7, 3]],          // dormant: all 6 occurrences well outside the recent window
            [[6, 3], [1, 3]],          // reactivated after a gap: half recent, half not
            [[5, 6]],                  // isolated past cluster, nothing recent
            [[4, 2], [2, 2], [1, 2]],  // gradual/frequent: spread across the recent boundary
        ];

        foreach ($repeatStudents as $i => $studentId) {
            $violationId = $violationIds[array_rand($violationIds)];
            $profile = $profiles[$i % count($profiles)];

            // Oldest cluster first, so months_since_last/past_repeat
            // reflect a real timeline instead of same-day noise.
            foreach ($profile as [$monthsBack, $occurrenceCount]) {
                $monthStart = now()->subMonths($monthsBack)->startOfMonth();

                for ($n = 0; $n < $occurrenceCount; $n++) {
                    $complainantId = collect($students)->reject(fn ($id) => $id === $studentId)->random();

                    // Spread within the month (day 1-28, valid for every
                    // month) so occurrences in the same cluster don't all
                    // share a timestamp.
                    $createdAt = $monthStart->copy()->addDays(random_int(0, 27))->addHours(random_int(0, 23));

                    // created_at must be set via an earlier chained state, not
                    // the top-level create() override — resolved() computes
                    // confirmed_at/resolved_at FROM created_at, and create()'s
                    // override array is merged in last, after that's already
                    // happened, which would leave those dates inconsistent
                    // with a later top-level created_at override.
                    $complaint = Complaint::factory()
                        ->state(['created_at' => $createdAt])
                        ->resolved()
                        ->create([
                            'complainant_id' => $complainantId,
                            'incident_id' => $violationId,
                        ]);

                    $this->attachSubjects($complaint, [$studentId]);
                    $this->generateDocument($complaint);
                }
            }
        }
    }

    /**
     * Builds a complaint that's already gone through its one allowed edit,
     * mirroring ComplaintController::updateComplaint() by hand: snapshots
     * the pre-edit state into complaint_revision (including copying the
     * original evidence files into previous_evidences/), then applies the
     * "edit" — one evidence removed from evidences/ (only ever living on in
     * previous_evidences/ now), one new evidence added, description/incident/
     * subject changed, edited_at set.
     */
    private function seedEditedComplaint(array $students): void
    {
        $violation = Violation::inRandomOrder()->first();
        $newViolation = Violation::where('id', '!=', $violation?->id)->inRandomOrder()->first();

        $complainantId = $students[array_rand($students)];
        $originalSubjectId = collect($students)->reject(fn ($id) => $id === $complainantId)->random();
        $newSubjectId = collect($students)
            ->reject(fn ($id) => in_array($id, [$complainantId, $originalSubjectId]))
            ->random();

        $complaint = Complaint::factory()->create([
            'complainant_id' => $complainantId,
            'incident_id' => $violation?->id,
            'complaint_status' => 'pending',
        ]);
        $this->attachSubjects($complaint, [$originalSubjectId]);

        $complaintFolderPath = storage_path("app/private/complaints/complaint-{$complaint->complaint_number}");
        $evidencesFolder = "{$complaintFolderPath}/evidences";
        $previousEvidencesFolder = "{$complaintFolderPath}/previous_evidences";
        File::ensureDirectoryExists($previousEvidencesFolder);

        $originalEvidences = json_decode($complaint->complaint_evidences, true) ?? [];
        foreach ($originalEvidences as $e) {
            $src = "{$evidencesFolder}/{$e['file']}";
            if (File::exists($src)) {
                File::copy($src, "{$previousEvidencesFolder}/{$e['file']}");
            }
        }

        $previousSubjects = ComplaintSubject::where('complaint_id', $complaint->id)
            ->with('user.profile')
            ->get()
            ->map(fn ($s) => [
                'first_name' => $s->user?->profile?->first_name,
                'middle_name' => $s->user?->profile?->middle_name,
                'last_name' => $s->user?->profile?->last_name,
            ]);

        $editedAt = \Carbon\Carbon::parse($complaint->created_at ?? now())->addHours(random_int(2, 20));

        ComplaintRevision::create([
            'complaint_id' => $complaint->id,
            'incident' => $violation?->violation_name,
            'complaint_description' => $complaint->complaint_description,
            'complaint_evidences' => $complaint->complaint_evidences,
            'subjects' => json_encode($previousSubjects->values()),
            'created_at' => $editedAt,
        ]);

        // Apply the edit: drop the first evidence from the active folder
        // (its copy already lives in previous_evidences/ above)...
        if (!empty($originalEvidences)) {
            $removed = array_shift($originalEvidences);
            $removedPath = "{$evidencesFolder}/{$removed['file']}";
            if (File::exists($removedPath)) {
                File::delete($removedPath);
            }
        }

        // ...and add one new evidence file on top.
        $newFileName = (count($originalEvidences) + 1) . "-edited-{$complaint->complaint_number}.jpg";
        $this->makePlaceholderImage("{$evidencesFolder}/{$newFileName}", 'New Evidence After Edit');
        $originalEvidences[] = ['type' => 'pic', 'file' => $newFileName];

        ComplaintSubject::where('complaint_id', $complaint->id)
            ->where('student_id', $originalSubjectId)
            ->delete();
        ComplaintSubject::insert(['complaint_id' => $complaint->id, 'student_id' => $newSubjectId]);

        $complaint->update([
            'incident_id' => $newViolation?->id,
            'complaint_description' => \Database\Factories\ComplaintFactory::randomComplaintDescription($newViolation),
            'complaint_evidences' => json_encode($originalEvidences),
            'edited_at' => $editedAt,
        ]);
    }
}
