<?php

namespace App\Services;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use App\Models\ViolationRiskSample;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * The inputs of the Early Intervention Violation Predictor (the Python ML
 * service, reached at services.python_api.url), in
 * one place, so live predictions and the training history are built the
 * same way.
 *
 * One row per (student, violation) the student has a resolved record of,
 * describing them AS OF a given moment (only what was known then):
 *
 *   violation_id                      the violation (its id; live rows also carry
 *                                     violation_type, its name, for the insights text)
 *   past_repeat_same_violation_count  records of this violation so far
 *   recent_same_violation_count       of those, in the last 90 days (0 for a first offense)
 *   months_since_last_same_violation  months since the latest one (120 = first offense)
 *   max_offense_level                 how many levels this violation's penalty ladder has (1-6)
 *   other_violations_count            records of the student's OTHER violations so far
 *   other_violations_recent_count     of those, in the last 90 days
 *   interventions_since_last          appointments attended, referrals approved and office
 *                                     calls confirmed that address THIS violation (linked to it
 *                                     in intervention_violations), since its latest record
 *                                     (for a saved training row: after its offense, up to the
 *                                     repeat or the end of its 90-day window; see labelPending())
 *   year_level                        the student's year level then (0 = unknown)
 *
 * live():            rows as of now, for the Behavioural Analysis page and the watch list.
 * recordComplaint(): when the Prefect resolves a complaint, saves each of its
 *                    students' rows for its violations (violation_risk_samples):
 *                    the model's real training data. Their outcome ("did the
 *                    same violation happen again within 90 days?") is filled
 *                    in later by labelPending().
 * trainingRows():    the labelled samples, sent to the model on every retrain.
 */
class ViolationRiskFeatures
{
    public const RECENT_DAYS = 90;

    public const FIRST_OFFENSE_MONTHS = 120;

    /**
     * Days after the 90-day window before a sample with no repeat is labelled
     * "did not repeat": a repeat committed inside the window may only be
     * resolved (and so recorded) some days later.
     */
    public const LABEL_GRACE_DAYS = 30;

    /** The model's input fields (what the Python side reads). */
    public const FEATURES = [
        'violation_id',
        'past_repeat_same_violation_count',
        'recent_same_violation_count',
        'months_since_last_same_violation',
        'max_offense_level',
        'other_violations_count',
        'other_violations_recent_count',
        'interventions_since_last',
        'year_level',
    ];

    /**
     * Rows as of now for these students (objects, like the old SQL rows:
     * student_id, violation_id + FEATURES).
     */
    public static function live($studentIds): Collection
    {
        $ids = collect($studentIds)->filter()->unique()->values();
        if ($ids->isEmpty()) {
            return collect();
        }
        $data = self::load($ids->all());
        $now = now();

        $rows = collect();
        foreach ($data['occurrences']->groupBy('student_id') as $studentId => $records) {
            foreach ($records->groupBy('violation_id') as $violationId => $_) {
                $row = self::rowAsOf($data, (int) $studentId, (int) $violationId, $now);
                if ($row) {
                    $rows->push((object) $row);
                }
            }
        }

        return $rows->values();
    }

    /**
     * Saves the model's training rows for a complaint the Prefect has just
     * resolved: one per student + violation in it, describing the student's
     * record at that moment (the same row a live prediction would use right
     * then). A re-resolved complaint replaces its earlier rows. Each row's
     * required inputs are checked first; a row that fails is skipped and
     * logged, never blocking the resolution itself.
     *
     * @return array{saved: int, skipped: array<int, string>}
     */
    public static function recordComplaint(int $complaintId, string $source = 'resolve'): array
    {
        $pairs = DB::table('complaint as c')
            ->join('complaint_subject_violation as cso', 'cso.complaint_id', '=', 'c.id')
            ->where('c.id', $complaintId)
            ->where('c.complaint_status', 'resolved')
            ->whereNotNull('cso.violation_id')
            ->selectRaw('cso.student_id, cso.violation_id,
                COALESCE(c.offense_issued_at, c.resolved_at, c.confirmed_at, c.created_at) AS at')
            ->get();

        ViolationRiskSample::where('complaint_id', $complaintId)->whereNull('will_repeat')->delete();
        if ($pairs->isEmpty()) {
            return ['saved' => 0, 'skipped' => []];
        }

        $data = self::load($pairs->pluck('student_id')->map(fn ($id) => (int) $id)->unique()->values()->all());
        $students = \App\Models\User::whereIn('id', $pairs->pluck('student_id'))->whereRole('student')->pluck('id')->map(fn ($id) => (int) $id);
        $violations = DB::table('violation')->whereIn('id', $pairs->pluck('violation_id'))->pluck('violation_name', 'id');

        $saved = 0;
        $skipped = [];
        foreach ($pairs->unique(fn ($p) => "{$p->student_id}:{$p->violation_id}") as $p) {
            $key = "student {$p->student_id}, violation {$p->violation_id}";
            $at = $p->at ? Carbon::parse($p->at) : null;
            $row = $at ? self::rowAsOf($data, (int) $p->student_id, (int) $p->violation_id, $at) : null;

            $problem = match (true) {
                ! $students->contains((int) $p->student_id) => 'the person is not a student',
                ! isset($violations[$p->violation_id]) => 'the violation does not exist',
                $at === null => 'the complaint has no offense date',
                $row === null => 'no resolved record of the violation was found',
                default => self::missingInput($row),
            };
            if ($problem) {
                $skipped[] = "{$key}: {$problem}";

                continue;
            }

            // A labelled row is final; only a still-pending one is replaced.
            $exists = ViolationRiskSample::where([
                'complaint_id' => $complaintId, 'student_id' => $p->student_id, 'violation_id' => $p->violation_id,
            ])->exists();
            if ($exists) {
                continue;
            }

            ViolationRiskSample::create(
                ['complaint_id' => $complaintId, 'student_id' => (int) $p->student_id]
                + array_intersect_key($row, array_flip(self::FEATURES))
                + ['observed_at' => $at, 'source' => $source]
            );
            $saved++;
        }

        if ($skipped) {
            Log::warning('Violation predictor: training rows skipped for a resolved complaint', ['complaint_id' => $complaintId, 'skipped' => $skipped]);
        }

        return ['saved' => $saved, 'skipped' => $skipped];
    }

    /** The first required model input missing or out of range, or null. */
    private static function missingInput(array $row): ?string
    {
        foreach (self::FEATURES as $field) {
            if (! array_key_exists($field, $row) || $row[$field] === null || ! is_numeric($row[$field])) {
                return "missing {$field}";
            }
            if ($row[$field] < 0) {
                return "{$field} is negative";
            }
        }
        if ($row['past_repeat_same_violation_count'] < 1) {
            return 'past_repeat_same_violation_count must be at least 1';
        }
        if ($row['recent_same_violation_count'] > $row['past_repeat_same_violation_count']) {
            return 'recent_same_violation_count is above past_repeat_same_violation_count';
        }
        if ($row['max_offense_level'] < 1 || $row['max_offense_level'] > 6) {
            return 'max_offense_level is outside 1-6';
        }

        return null;
    }

    /**
     * Fills in the outcome of samples still waiting for it: 1 as soon as the
     * same violation is recorded again within 90 days of the sample, 0 once
     * the window and the grace period have passed without one.
     *
     * Also keeps each waiting sample's interventions_since_last up to date.
     * When a row is saved (on resolve) nothing can have happened after the
     * offense yet, so it starts at 0; what matters is what the office did
     * AFTER the offense and BEFORE the outcome was decided: until the repeat
     * if there was one, otherwise over the whole 90-day window. The count is
     * final once the row is labelled.
     *
     * @return array{repeated: int, not_repeated: int, pending: int}
     */
    public static function labelPending(?CarbonInterface $now = null): array
    {
        $now = $now ? Carbon::instance($now) : now();
        $pending = ViolationRiskSample::whereNull('will_repeat')->get();
        $counts = ['repeated' => 0, 'not_repeated' => 0, 'pending' => 0];
        if ($pending->isEmpty()) {
            return $counts;
        }

        $data = self::load($pending->pluck('student_id')->unique()->values()->all());

        foreach ($pending as $sample) {
            [$repeatAt, $until] = self::outcomeWindow($data, $sample);
            $interventions = self::interventionsBetween($data, $sample, $repeatAt ?? $until->copy()->min($now));

            if ($repeatAt) {
                $sample->update(['will_repeat' => true, 'labelled_at' => $now, 'interventions_since_last' => $interventions]);
                $counts['repeated']++;
            } elseif ($now->gte($until->copy()->addDays(self::LABEL_GRACE_DAYS))) {
                $sample->update(['will_repeat' => false, 'labelled_at' => $now, 'interventions_since_last' => $interventions]);
                $counts['not_repeated']++;
            } else {
                $sample->update(['interventions_since_last' => $interventions]);
                $counts['pending']++;
            }
        }

        return $counts;
    }

    /**
     * Recounts interventions_since_last of every sample, labelled or not, the
     * same way labelPending() does (a repair for rows saved before the count
     * was kept up to date). Returns how many rows changed.
     */
    public static function recountInterventions(?CarbonInterface $now = null): int
    {
        $now = $now ? Carbon::instance($now) : now();
        $samples = ViolationRiskSample::all();
        if ($samples->isEmpty()) {
            return 0;
        }
        $data = self::load($samples->pluck('student_id')->unique()->values()->all());

        $changed = 0;
        foreach ($samples as $sample) {
            [$repeatAt, $until] = self::outcomeWindow($data, $sample);
            $n = self::interventionsBetween($data, $sample, $repeatAt ?? $until->copy()->min($now));
            if ((int) $sample->interventions_since_last !== $n) {
                $sample->update(['interventions_since_last' => $n]);
                $changed++;
            }
        }

        return $changed;
    }

    /**
     * A sample's outcome window: [date of the first repeat within 90 days, or
     * null; the end of the 90 days].
     */
    private static function outcomeWindow(array $data, ViolationRiskSample $sample): array
    {
        $from = $sample->observed_at;
        $until = $from->copy()->addDays(self::RECENT_DAYS);
        $repeat = $data['occurrences']
            ->filter(fn ($o) => $o->student_id === (int) $sample->student_id && $o->violation_id === (int) $sample->violation_id
                && $o->at->gt($from) && $o->at->lte($until))
            ->sortBy('at')
            ->first();

        return [$repeat?->at, $until];
    }

    /** Interventions with the student after the sample's offense, up to $end. */
    private static function interventionsBetween(array $data, ViolationRiskSample $sample, CarbonInterface $end): int
    {
        return collect($data['interventions'][(int) $sample->student_id][(int) $sample->violation_id] ?? [])
            ->filter(fn ($d) => $d->gt($sample->observed_at) && $d->lte($end))
            ->count();
    }

    /**
     * Saves rows for every complaint resolved before samples were recorded
     * (each at its own offense date), then labels them. Safe to run again.
     */
    public static function backfill(): array
    {
        $done = ViolationRiskSample::whereNotNull('complaint_id')->distinct()->pluck('complaint_id');
        $complaints = DB::table('complaint')->where('complaint_status', 'resolved')
            ->whereNotIn('id', $done)->orderBy('id')->pluck('id');

        $saved = 0;
        $skipped = [];
        foreach ($complaints as $id) {
            $r = self::recordComplaint((int) $id, 'backfill');
            $saved += $r['saved'];
            array_push($skipped, ...$r['skipped']);
        }

        return [
            'complaints' => $complaints->count(),
            'saved' => $saved,
            'skipped' => $skipped,
            'labels' => self::labelPending(),
            'interventions_recounted' => self::recountInterventions(),
        ];
    }

    /**
     * The labelled samples as training rows (student_id + FEATURES + the
     * outcome), labelling any that became due first.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function trainingRows(): array
    {
        self::labelPending();

        return ViolationRiskSample::whereNotNull('will_repeat')->orderBy('id')->get()
            ->map(fn ($s) => ['student_id' => (int) $s->student_id]
                + collect(self::FEATURES)->mapWithKeys(fn ($f) => [$f => (int) $s->{$f}])->all()
                + ['will_repeat_the_same_violation' => $s->will_repeat ? 1 : 0])
            ->all();
    }

    /**
     * One student's row for one violation as of $asOf, or null when they
     * had no record of it yet.
     */
    private static function rowAsOf(array $data, int $studentId, int $violationId, CarbonInterface $asOf): ?array
    {
        $mine = $data['occurrences']->where('student_id', $studentId)->filter(fn ($o) => $o->at->lte($asOf));
        $same = $mine->where('violation_id', $violationId)->sortBy('at')->values();
        if ($same->isEmpty()) {
            return null;
        }
        $others = $mine->where('violation_id', '!=', $violationId);
        $recentFrom = Carbon::instance($asOf)->subDays(self::RECENT_DAYS);
        $last = $same->last()->at;
        $past = $same->count();

        $interventions = collect($data['interventions'][$studentId][$violationId] ?? [])
            ->filter(fn ($d) => $d->gt($last) && $d->lte($asOf))
            ->count();

        return [
            'student_id' => $studentId,
            'violation_id' => $violationId,
            'violation_type' => $same->last()->violation_type,
            'past_repeat_same_violation_count' => $past,
            // A first offense has no repeat history to be recent (it would
            // otherwise always look recent): 0 and the 120 marker.
            'recent_same_violation_count' => $past === 1 ? 0 : $same->filter(fn ($o) => $o->at->gte($recentFrom))->count(),
            'months_since_last_same_violation' => $past === 1
                ? self::FIRST_OFFENSE_MONTHS
                : (int) floor(abs($last->diffInMonths($asOf))),
            'max_offense_level' => $data['ladders'][$violationId] ?? 6,
            'other_violations_count' => $others->count(),
            'other_violations_recent_count' => $others->filter(fn ($o) => $o->at->gte($recentFrom))->count(),
            'interventions_since_last' => $interventions,
            'year_level' => self::yearLevelAt($data['enrollments'][$studentId] ?? [], $asOf),
        ];
    }

    private static function yearLevelAt(array $enrollments, CarbonInterface $asOf): int
    {
        // The latest enrollment that had started by then, else the earliest.
        $then = collect($enrollments)->filter(fn ($e) => $e['at']->lte($asOf))->sortBy('at')->last()
            ?? collect($enrollments)->sortBy('at')->first();

        return (int) ($then['year_level'] ?? 0);
    }

    /**
     * Everything the rows are built from, in a few queries: resolved
     * violation records, each violation's ladder length, interventions and
     * enrollments. $studentIds null = every student.
     */
    private static function load(?array $studentIds): array
    {
        $only = fn ($q, $column) => $studentIds === null ? $q : $q->whereIn($column, $studentIds);

        // The date of a record: when the offense was issued, falling back
        // through the complaint's lifecycle (as everywhere else).
        $occurrences = $only(
            DB::table('complaint as c')
                ->join('complaint_subject as cs', 'cs.complaint_id', '=', 'c.id')
                ->join('complaint_subject_violation as cso', function ($join) {
                    $join->on('cso.complaint_id', '=', 'c.id')->on('cso.student_id', '=', 'cs.student_id');
                })
                ->join('violation as o', 'o.id', '=', 'cso.violation_id')
                ->where('c.complaint_status', 'resolved'),
            'cs.student_id'
        )
            ->selectRaw('cs.student_id, cso.violation_id, o.violation_name AS violation_type,
                COALESCE(c.offense_issued_at, c.resolved_at, c.confirmed_at, c.created_at) AS at')
            ->get()
            ->filter(fn ($o) => $o->at !== null)
            ->map(function ($o) {
                $o->student_id = (int) $o->student_id;
                $o->violation_id = (int) $o->violation_id;
                $o->at = Carbon::parse($o->at);

                return $o;
            })
            ->values();

        $ladders = DB::table('violation_penalty')
            ->groupBy('violation_id')
            ->selectRaw('violation_id, MAX(occurrence) AS levels')
            ->pluck('levels', 'violation_id')
            ->map(fn ($n) => max(1, min(6, (int) $n)))
            ->all();

        $students = $studentIds ?? $occurrences->pluck('student_id')->unique()->all();

        // Interventions, per student and per violation they address (only
        // ones linked to a violation in intervention_violations count): an
        // appointment the student attended, a referral of the student that
        // was approved, an office call the student came to (present).
        $interventions = [];
        $add = function ($rows) use (&$interventions) {
            foreach ($rows as $r) {
                if ($r->at) {
                    $interventions[(int) $r->student_id][(int) $r->violation_id][] = Carbon::parse($r->at);
                }
            }
        };
        // A link counts only for the student it names (a referral's students
        // are each referred about their own violations).
        $linked = fn ($q, $type, $idColumn, $studentColumn) => $q->join('intervention_violations as iv', function ($j) use ($type, $idColumn, $studentColumn) {
            $j->on('iv.intervention_id', '=', $idColumn)->where('iv.intervention_type', '=', $type)
                ->on('iv.student_id', '=', $studentColumn);
        });
        $add($linked(DB::table('appointment as a'), 'appointment', 'a.id', 'a.user_id')->whereIn('a.user_id', $students)
            ->where('a.appointment_status', 'accepted')->where('a.attendance_status', 'present')
            ->selectRaw('a.user_id AS student_id, iv.violation_id, a.date_time_appoint AS at')->get());
        $add($linked(DB::table('referral_referred_student as rs')->join('referral as r', 'r.id', '=', 'rs.referral_id'), 'referral', 'r.id', 'rs.student_id')
            ->whereIn('rs.student_id', $students)->whereNotNull('r.confirmed_at')->whereNull('r.revoked_at')
            ->selectRaw('rs.student_id, iv.violation_id, r.confirmed_at AS at')->get());
        $add($linked(DB::table('call_in as ci'), 'call_in', 'ci.id', 'ci.student_id')->whereIn('ci.student_id', $students)->where('ci.attendance_status', 'present')
            ->selectRaw('ci.student_id, iv.violation_id, ci.confirmed_at AS at')->get());

        $enrollments = [];
        foreach (DB::table('enrollment')->whereIn('student_id', $students)->get(['student_id', 'year_level', 'created_at']) as $e) {
            $enrollments[(int) $e->student_id][] = [
                'year_level' => (int) $e->year_level,
                'at' => Carbon::parse($e->created_at ?? '1970-01-01'),
            ];
        }

        return compact('occurrences', 'ladders', 'interventions', 'enrollments');
    }
}
