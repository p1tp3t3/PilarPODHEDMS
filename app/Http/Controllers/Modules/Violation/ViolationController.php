<?php

namespace App\Http\Controllers\Modules\Violation;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Modules\Complaint\ComplaintController;
use App\Models\ActionLog;
use App\Models\Complaint;
use App\Models\ComplaintSubject;
use App\Models\ComplaintSubjectViolation;
use App\Models\SchoolYearSemester;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationPenalty;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class ViolationController extends Controller
{
    /**
     * Super admin manages the violation/penalty catalog (system
     * configuration) but a specific student's violation history is
     * disciplinary data, not configuration — every per-student
     * violation/risk view is off-limits to that role.
     */
    private static function isSuperAdmin(): bool
    {
        return auth()->user()->role === 'super_admin';
    }

    /**
     * The violation/penalty catalog for OffenseList's client-side fetch
     * fallback (used wherever it's rendered without a `list` prop already
     * supplied, e.g. the student dashboard's "List of Violations" tab) —
     * same query the prefect dashboard already passes down directly.
     */
    public function getOffenseList()
    {
        return response()->json(
            Violation::with(['penalties.penalty'])->latest('created_at')->get()
        );
    }

    /**
     * The reverse of studentViolationIndex() — given a violation type,
     * every student who has committed it (via a resolved complaint) plus
     * how many times each of them has, for the "View" action on the
     * Manage Violations list.
     */
    public function violationStudentsIndex($id)
    {
        $violation = Violation::with(['penalties.penalty'])->findOrFail($id);

        $students = ComplaintSubjectViolation::with(['user.profile', 'user.program', 'user.enrollments', 'user.teachingStaff.program'])
            ->where('violation_id', $id)
            ->whereHas('complaint', function ($q) {
                $q->where('complaint_status', 'resolved');
            })
            ->get()
            ->groupBy('student_id')
            ->map(function ($group) {
                $first = $group->first();

                return [
                    'student_id' => $first->student_id,
                    'user' => $first->user,
                    'violation_count' => $group->count(),
                ];
            })
            ->values();

        // How many students currently sit at each occurrence count (1st,
        // 2nd, 3rd... offense of this specific violation) — aggregate
        // counts only, no student identity, so this is safe to keep for
        // every role including super_admin.
        $occurrenceBreakdown = $students
            ->groupBy('violation_count')
            ->map(fn ($group, $occurrence) => [
                'occurrence' => (int) $occurrence,
                'student_count' => $group->count(),
            ])
            ->sortBy('occurrence')
            ->values();

        return Inertia::render('itrc/maintenance/violation-students', [
            'user' => auth()->user(),
            'violation' => $violation,
            // Super admin manages the violation/penalty catalog, not student
            // disciplinary records — withhold the actual student roster.
            'students' => auth()->user()->role === 'super_admin' ? [] : $students,
            'occurrence_breakdown' => $occurrenceBreakdown,
        ]);
    }

    public function studentViolationIndex($id)
    {
        if (self::isSuperAdmin()) {
            return redirect('/violation-management');
        }

        $studentViolations = ComplaintSubjectViolation::with(['violation', 'complaint'])->whereHas('complaint', function ($d) {
            $d->latest('offense_issued_at');
        })
            ->where('student_id', $id);
        $violationNames = ComplaintSubjectViolation::join(
            'violation',
            'complaint_subject_violation.violation_id',
            '=',
            'violation.id'
        )
            ->where('complaint_subject_violation.student_id', $id)
            ->distinct()
            ->get(['violation.id', 'violation.violation_name']);

        return Inertia::render('other/student-violation', [
            'user' => auth()->user(),
            'student' => User::with(['profile', 'program', 'enrollments.schoolYear'])->where('id', $id)->first(),
            'student_violations' => $studentViolations->get(),
            'violations' => $violationNames,
        ]);
    }

    public function studentRiskIndex($id)
    {
        if (self::isSuperAdmin()) {
            return redirect('/violation-management');
        }

        return Inertia::render('other/student-risk-prediction', [
            'user' => auth()->user(),
            'student' => User::with('program')->where('id', $id)->first(),
        ]);
    }

    public function store(Request $request)
    {
        return self::multipleViolationStore($request);
    }

    private function multipleViolationStore($request)
    {
        DB::beginTransaction();
        $generatedFiles = [];

        try {
            $subjects = json_decode($request->subjects, true);
            $summary = $request->incident_summary;

            if (! is_array($subjects) || empty($subjects)) {
                return response()->json(['message' => 'No subjects provided.'], 400);
            }
            if (empty(trim((string) $summary))) {
                return response()->json(['message' => 'Please provide a summary of the incident.'], 400);
            }

            // Fetch complaint
            $complaint = Complaint::with(['user.profile', 'subject.profile'])
                ->where('id', $request->id);

            $complaintId = $complaint->first()->id;
            $complaintNumber = $complaint->first()->complaint_number;
            $complaintFolder = storage_path("app/private/complaints/complaint-{$complaintNumber}");

            // Ensure folder exists
            if (! File::isDirectory($complaintFolder)) {
                File::makeDirectory($complaintFolder, 0777, true, true);
            }

            foreach ($subjects as $sub) {

                $studentId = $sub['student_id'];

                // ----------------------------------------------------------------------
                // 1. SAVE or UPDATE ComplaintSubject
                // ----------------------------------------------------------------------
                ComplaintSubject::firstOrCreate([
                    'complaint_id' => $complaintId,
                    'student_id' => $studentId,
                ]);
                // ----------------------------------------------------------------------
                // 2. DELETE OLD OFFENSES for this student (fresh update)
                // ----------------------------------------------------------------------
                $oldViolationIds = ComplaintSubjectViolation::where('complaint_id', $complaintId)
                    ->where('student_id', $studentId)
                    ->whereNotNull('violation_id')
                    ->pluck('violation_id');
                $oldViolationNames = $oldViolationIds->isEmpty()
                    ? 'None'
                    : Violation::whereIn('id', $oldViolationIds)->pluck('violation_name')->implode(', ');

                ComplaintSubjectViolation::where(
                    'complaint_id', $complaintId
                )
                    ->where(
                        'student_id', $studentId
                    )
                    ->delete();

                // ----------------------------------------------------------------------
                // 3. INSERT NEW OFFENSES
                // ----------------------------------------------------------------------
                foreach ($sub['offenses'] as $off) {

                    if ($off['violation'] === 'none') {
                        // Special case: no offense committed
                        ComplaintSubjectViolation::create([
                            'complaint_id' => $complaintId,
                            'student_id' => $studentId,
                            'violation_id' => null,
                        ]);

                        continue;
                    } else {
                        // Normal violation
                        ComplaintSubjectViolation::create([
                            'complaint_id' => $complaintId,
                            'student_id' => $studentId,
                            'violation_id' => $off['violation'],
                        ]);
                    }
                }

                // ----------------------------------------------------------------------
                // 4. Log Action
                // ----------------------------------------------------------------------
                $newViolationIds = collect($sub['offenses'])->pluck('violation')->reject(fn ($v) => $v === 'none');
                $newViolationNames = $newViolationIds->isEmpty()
                    ? 'None'
                    : Violation::whereIn('id', $newViolationIds)->pluck('violation_name')->implode(', ');

                ActionLog::log(
                    auth()->user()->id,
                    'complaint',
                    "Resolved complaint for student $studentId in case #{$complaint->first()->case_number}",
                    ['violations' => ['from' => $oldViolationNames, 'to' => $newViolationNames]]
                );
            }

            // ----------------------------------------------------------------------
            // 5. Generate ONE complaint PDF covering every subject — one form,
            //    not one per complainee.
            // ----------------------------------------------------------------------
            $filePath = "{$complaintFolder}/complaint-{$complaintNumber}.pdf";

            $complaintWithSubjects = Complaint::with(['user.profile', 'subject.profile', 'complaintSubject.user.profile'])
                ->find($complaintId);
            $field = (new ComplaintController)->getComplaintDocumentField($complaintWithSubjects, $summary);
            Pdf::loadView('pdf.complaint-subject', $field)->save($filePath);

            $generatedFiles[] = $filePath;

            // ----------------------------------------------------------------------
            // 6. Update Complaint to RESOLVED
            // ----------------------------------------------------------------------
            $complaint->update([
                'complaint_status' => 'resolved',
                'offense_issued_at' => now(),
                'archived_at' => archive_retention_date(),
                'incident_summary' => $summary,
                'resolved_school_year_semester_id' => SchoolYearSemester::currentId(),
            ]);

            DB::commit();

            return response()->json(['message' => 'Complaint resolved successfully']);

        } catch (\Throwable $e) {

            DB::rollBack();

            // Remove generated files
            foreach ($generatedFiles as $file) {
                if (File::exists($file)) {
                    File::delete($file);
                }
            }

            Log::error('Complaint resolution failed', [
                'error' => $e->getMessage(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'message' => 'An error occurred while resolving the complaint.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function getStudentIncident($studentId)
    {
        if (self::isSuperAdmin()) {
            return response()->json(['message' => 'Not authorized to view student violation data.'], 403);
        }

        $incidents = ComplaintSubject::with([
            'complaint',
            'offenses.violation', // optional if you need violation data
        ])
            ->where('student_id', $studentId)
            ->whereHas('complaint', function ($q) {
                $q->where('complaint_status', 'resolved');
            })
            ->orderByDesc(
                Complaint::select('created_at')
                    ->whereColumn('complaint.id', 'complaint_subject.complaint_id')
                    ->limit(1)
            )
            ->get();

        // Prefer the complaint-level summary (one shared narrative per
        // complaint); fall back to this subject's own for complaints resolved
        // before the summary moved to the complaint.
        $incidents->each(function ($cs) {
            $cs->incident_summary = $cs->complaint->incident_summary ?? $cs->incident_summary;
        });

        return response()->json($incidents);

    }

    public function getStudentViolation($studentId = null)
    {
        if (self::isSuperAdmin()) {
            return response()->json(['message' => 'Not authorized to view student violation data.'], 403);
        }

        $incidents = ComplaintSubject::with([
            'complaint',
            'offenses.violation',
        ])
            ->where('student_id', $studentId)
            ->whereHas('complaint', function ($q) {
                $q->where('complaint_status', 'resolved');
            })
            ->orderByDesc(
                Complaint::select('created_at')
                    ->whereColumn('complaint.id', 'complaint_subject.complaint_id') // adjust table names if different
                    ->limit(1)
            )
            ->get();

        // Build: violation => incidents[]
        $grouped = $incidents
            ->flatMap(function ($incident) use ($studentId) {
                return $incident->offenses
                    ->where('student_id', $studentId)
                    ->map(function ($offense) use ($incident, $studentId) {
                        $violation = $offense->violation;

                        if (! $violation) {
                            return null;
                        }

                        return [
                            'violation_id' => $violation->id,
                            'violation_name' => $violation->violation_name,

                            // ✅ incident must be a list
                            'incidents' => ComplaintSubject::with('complaint.violation')
                                ->whereHas('complaint', function ($q) use ($violation) {
                                    $q->where('incident_id', $violation->id);
                                })
                                ->where('student_id', $studentId)
                                ->get()
                                ->map(fn ($d) => [
                                    'case_number' => $d->complaint->case_number,
                                    'incident' => $d->complaint->violation?->violation_name,
                                    'summary' => $d->incident_summary,
                                    'created_at' => $d->complaint->created_at,
                                    'resolved_since' => $d->complaint->offense_issued_at,
                                    'status' => $d->complaint->complaint_status,
                                ]),
                            'offenses' => $incident->offenses
                                ->where('student_id', $incident->student_id)
                                ->where('violation_id', $violation->id)
                                ->map(function ($o) {
                                    return [
                                        'id' => $o->id,
                                        'violation_id' => $o->violation_id,
                                    ];
                                })
                                ->values()
                                ->toArray(),
                        ];
                    })
                    ->filter(); // remove nulls
            })
            ->groupBy('violation_id')
            ->map(function ($rows) {
                // rows are entries with same violation_id; extract violation info once
                $first = $rows->first();

                // unique incidents by complaint_subject_id
                $incidents = $rows
                    ->unique('complaint_subject_id')
                    ->values()
                    ->toArray();

                return $first;
            })
            ->values()
            ->toArray();

        return $grouped;
    }

    public function getStudentViolationOccurence($id)
    {
        if (self::isSuperAdmin()) {
            return response()->json(['message' => 'Not authorized to view student violation data.'], 403);
        }

        // One row per INDIVIDUAL occurrence, not just a per-violation
        // summary — the student profile needs the date and applicable
        // penalty for each offense, not just the total count. Same
        // chronological occurrence-numbering approach as
        // GenerateReportJob::studentViolationOccurrences(): sort every
        // recorded offense oldest-first, then number occurrences 1, 2, 3...
        // per violation as they're encountered in that order.
        $records = ComplaintSubjectViolation::where('student_id', $id)
            ->whereNotNull('violation_id')
            ->with(['violation', 'complaint'])
            ->get()
            ->sortBy(fn ($v) => $v->complaint?->offense_issued_at
                ?? $v->complaint?->resolved_at
                ?? $v->complaint?->confirmed_at
                ?? $v->complaint?->created_at)
            ->values();

        if ($records->isEmpty()) {
            return [];
        }

        $counts = [];
        $byViolation = [];

        foreach ($records as $rec) {
            $violationId = $rec->violation_id;
            $occurrenceNumber = ($counts[$violationId] ?? 0) + 1;
            $counts[$violationId] = $occurrenceNumber;

            // The standing penalty at this occurrence count (the tier at or
            // below it, since penalty ladders don't necessarily define every
            // single occurrence number).
            $penaltyRecord = ViolationPenalty::with('penalty')
                ->where('violation_id', $violationId)
                ->where('occurrence', '<=', $occurrenceNumber)
                ->orderBy('occurrence', 'desc')
                ->first();

            $byViolation[$violationId]['violation'] = $rec->violation;
            $byViolation[$violationId]['occurrences'][] = [
                'occurrence' => $occurrenceNumber,
                'complaint_id' => $rec->complaint_id,
                'date' => $rec->complaint?->offense_issued_at
                    ?? $rec->complaint?->resolved_at
                    ?? $rec->complaint?->confirmed_at
                    ?? $rec->complaint?->created_at,
                'penalty' => $penaltyRecord ? [
                    'occurrence_used' => $penaltyRecord->occurrence,
                    'penalty_id' => $penaltyRecord->penalty_id,
                    'description' => $penaltyRecord->penalty->description ?? null,
                ] : null,
            ];
        }

        $result = [];
        foreach ($byViolation as $violationId => $data) {
            $result[] = [
                'offense' => [
                    'violation_id' => $violationId,
                    'violation' => $data['violation'],
                    'occurrences' => count($data['occurrences']),
                ],
                'total_occurrence' => count($data['occurrences']),
                'occurrence_list' => $data['occurrences'],
            ];
        }

        return $result;
    }

    public function getStudentBehaviourAnalysisResult($violation, $studentId)
    {
        if (self::isSuperAdmin()) {
            return response()->json(['message' => 'Not authorized to view student violation data.'], 403);
        }

        $baseQuery = self::getModelInput($violation)
            ->where('cs.student_id', $studentId)
            ->groupBy('cs.student_id');
        $rows = $baseQuery->get();

        // offense_issued_at is only set once a prefect formally issues the
        // offense and is null for most complaints — ordering by it alone
        // meant every row tied and came back in arbitrary (insertion) order.
        // Fall back through the same complaint-lifecycle timestamps used
        // elsewhere (getModelInput()'s SQL, the frontend's bestComplaintDate).
        $violationTimeline = ComplaintSubjectViolation::with(['violation', 'complaint.complaintSubject'])
            ->where('violation_id', $violation)
            ->where('student_id', $studentId)
            ->orderByDesc(
                Complaint::selectRaw('COALESCE(offense_issued_at, resolved_at, confirmed_at, created_at)')
                    ->whereColumn('complaint.id', 'complaint_subject_violation.complaint_id')
                    ->limit(1)
            )
            ->get()
            ->toArray();

        // A violation can appear in the student's selectable list from a
        // still-pending/ongoing complaint (studentViolationIndex() doesn't
        // filter by status), while getModelInput() only counts *resolved*
        // occurrences — so this student can legitimately have zero rows
        // here. Fail soft instead of crashing on an empty result.
        if ($rows->isEmpty()) {
            return [
                'prediction' => 'Not Enough Data',
                'binary' => 0,
                'insights' => ['This student has no resolved complaints for this violation yet, so a prediction cannot be made.'],
                'recommendations' => [],
                'violation_timeline' => $violationTimeline,
            ];
        }

        // DB::table()->get() rows are stdClass, not arrays — Collection::toArray()
        // doesn't convert them, it just wraps the stdClass objects as-is. Cast to
        // array explicitly rather than relying on json_encode() happening to
        // serialize a stdClass the same way it would a real array.
        $studentData = (array) $rows->first();
        $api = Http::withoutVerifying()->post('http://127.0.0.1:5032/python/model/predict', $studentData);
        $data = $api->json();

        if (! $api->successful() || ! is_array($data) || ! array_key_exists('prediction', $data)) {
            return [
                'prediction' => 'Unavailable',
                'binary' => 0,
                'insights' => ['The prediction service is currently unavailable. Please try again later.'],
                'recommendations' => [],
                'violation_timeline' => $violationTimeline,
            ];
        }

        return [
            'prediction' => $data['prediction'] == 1 ? 'Likely to Commit Again' : 'Unlikely to Commit Again',
            'binary' => $data['prediction'],
            'insights' => $data['insights'],
            'recommendations' => $data['reco'],
            'violation_timeline' => $violationTimeline,
        ];
    }

    public function getModelInput($violation)
    {
        $recentDays = 90;
        $ongoingDays = 30; // only used if you switch to time-window logic (optional)

        $query = DB::table('complaint as c')
            ->join('complaint_subject as cs', 'cs.complaint_id', '=', 'c.id')
            ->join('complaint_subject_violation as cso', function ($join) {
                $join->on('cso.complaint_id', '=', 'c.id')
                    ->on('cso.student_id', '=', 'cs.student_id');
            })
            ->join('violation as o', 'o.id', '=', 'cso.violation_id')
            ->where('c.complaint_status', 'resolved')
            ->where('cso.violation_id', $violation)
            ->groupBy('cs.student_id', 'o.violation_name', 'cso.violation_id')
            ->selectRaw('
                cs.student_id,
                o.violation_name AS violation_type,

                COUNT(*) AS past_repeat_same_violation_count,

                -- This feature is only meaningful once there is an actual
                -- PAST occurrence to measure recency against. For a genuine
                -- first offense (COUNT(*) = 1) it would otherwise be
                -- trivially recent by construction, not because of any real
                -- repeat pattern, which the model (trained mostly on real
                -- repeat-offender rows, where this IS meaningful) was
                -- learning as a false risk signal. Pin it to a neutral value
                -- instead so a first offense is judged on
                -- past_repeat_same_violation_count (1, i.e. this occurrence
                -- only) and violation_type, not spurious recency.
                CAST(CASE WHEN COUNT(*) = 1 THEN 0 ELSE
                    SUM(
                        CASE
                            WHEN c.offense_issued_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
                            THEN 1 ELSE 0
                        END
                    )
                END AS UNSIGNED) AS recent_same_violation_count,
                CASE WHEN COUNT(*) = 1 THEN 120 ELSE
                    TIMESTAMPDIFF(MONTH, MAX(COALESCE(c.offense_issued_at, c.resolved_at, c.confirmed_at, c.created_at)), CURDATE())
                END AS months_since_last_same_violation
            ', [$recentDays]);

        return $query;
    }
}
