<?php

namespace App\Http\Controllers\Modules\Violation;

use App\Services\ViolationRiskFeatures;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Modules\Complaint\ComplaintController;
use App\Models\ActionLog;
use App\Models\Complaint;
use App\Models\ComplaintSubject;
use App\Models\ComplaintSubjectViolation;
use App\Models\Enrollment;
use App\Models\User;
use App\Models\Violation;
use App\Models\ViolationPenalty;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Inertia;
use App\Http\Resources\Violation\PenaltyResource;
use App\Http\Resources\Violation\ViolationResource;
use App\Http\Resources\Account\UserResource;
use App\Http\Resources\Complaint\ComplaintSubjectViolationResource;

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
     * Who may see one student's incidents/violations:
     *  - the prefect (sub_admin): every student;
     *  - program heads and faculty: only as program head of the student's current program;
     *  - a student: only themselves;
     *  - a parent: only their own children (same family);
     *  - nobody else — not the super admin, not non-teaching staff.
     */
    public static function canViewStudent($studentId): bool
    {
        $user = auth()->user();

        switch ($user->role) {
            case 'sub_admin':
                return true;
            case 'program_head':
                $programId = Enrollment::where('student_id', $studentId)->latest('id')->value('program_id');

                return $programId && \App\Models\User::teachingProgramIdsFor($user->id)->contains($programId);
            case 'student':
                return (int) $user->id === (int) $studentId;
            case 'parent':
                $familyIds = \App\Models\FamilyMember::where('member_id', $user->id)->pluck('family_id');

                return $familyIds->isNotEmpty()
                    && \App\Models\FamilyMember::whereIn('family_id', $familyIds)->where('member_id', $studentId)->exists();
            default:
                return false;
        }
    }

    /**
     * The violation/penalty catalog for OffenseList's client-side fetch
     * fallback (used wherever it's rendered without a `list` prop already
     * supplied, e.g. the student dashboard's "List of Violations" tab) —
     * same query the prefect dashboard already passes down directly.
     */
    public function getPenaltyList()
    {
        return response()->json(PenaltyResource::collection(\App\Models\Penalty::latest('created_at')->get()));
    }

    public function getOffenseList()
    {
        return response()->json(
            ViolationResource::collection(Violation::active()->with(['penalties.penalty'])->latest('created_at')->get()
                ->each(fn ($v) => $v->encrypted_id = encrypt_id($v->id)))
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
        // Super admin manages the violation/penalty catalog, not student
        // disciplinary records — this page is the prefect's only.
        if (auth()->user()->role === 'super_admin') {
            return redirect('/violation-management/violations');
        }

        $id = decrypt_id($id) ?? abort(404);

        $violation = Violation::with(['penalties.penalty'])->findOrFail($id);

        // The two tables (Occurrences, Students): loaded by the page from
        // /api/violation-management/{id}/students once it opens.
        $students = fn () => ComplaintSubjectViolation::with(['user.profile', 'user.program', 'user.enrollments', 'user.faculty.program', 'user.headships.program'])
            ->where('violation_id', $id)
            ->whereHas('complaint', function ($q) {
                $q->where('complaint_status', 'resolved');
            })
            ->get()
            ->groupBy('student_id')
            ->map(function ($group) {
                $first = $group->first();
                $first->user->encrypted_id = encrypt_id($first->user->id);

                return [
                    'student_id' => $first->student_id,
                    'user' => UserResource::make($first->user),
                    'violation_count' => $group->count(),
                ];
            })
            ->values();

        // How many students currently sit at each occurrence count (1st,
        // 2nd, 3rd... offense of this specific violation).
        $occurrenceBreakdown = fn ($students) => $students
            ->groupBy('violation_count')
            ->map(fn ($group, $occurrence) => [
                'occurrence' => (int) $occurrence,
                'student_count' => $group->count(),
            ])
            ->sortBy('occurrence')
            ->values();

        $rows = null;
        $studentRows = function () use (&$rows, $students) {
            return $rows ??= $students();
        };

        return list_page('prefect/violation-students', [
            'violation' => ViolationResource::make($violation),
            'violation_key' => encrypt_id($violation->id),
            'students' => list_prop(fn () => $studentRows()),
            'occurrence_breakdown' => list_prop(fn () => $occurrenceBreakdown($studentRows())),
        ]);
    }

    public function studentViolationIndex($id)
    {
        $id = decrypt_id($id) ?? abort(404);

        if (self::isSuperAdmin()) {
            return redirect('/violation-management/violations');
        }
        abort_unless(self::canViewStudent($id), 403);

        $studentViolations = ComplaintSubjectViolation::with(['violation', 'complaint'])->whereHas('complaint', function ($d) {
            $d->latest('offense_issued_at');
        })
            ->where('student_id', $id);
        // Which offense each record was (1st, 2nd...) and the penalty it
        // carries — the same numbering the student profile uses.
        $occurrenceByRecord = collect(self::getStudentViolationOccurence($id))
            ->flatMap(fn ($v) => collect($v['occurrence_list'])
                ->mapWithKeys(fn ($o) => [$v['offense']['violation_id'].':'.$o['complaint_id'] => $o]));
        $violationNames = ComplaintSubjectViolation::join(
            'violation',
            'complaint_subject_violation.violation_id',
            '=',
            'violation.id'
        )
            ->where('complaint_subject_violation.student_id', $id)
            ->distinct()
            ->get(['violation.id', 'violation.violation_name']);

        return list_page('shared/student-violation', [
            'student' => UserResource::make(User::with(['profile', 'program', 'enrollments.schoolYear'])->where('id', $id)->first()),
            // The Recent Violations table: loaded by the page from
            // /api/student-violation/{id} once it opens.
            'student_violations' => list_prop(fn () => ComplaintSubjectViolationResource::collection($studentViolations->get()->each(function ($sv) use ($occurrenceByRecord) {
                $sv->complaint_key = $sv->complaint_id ? encrypt_id($sv->complaint_id) : null;
                $o = $occurrenceByRecord->get($sv->violation_id.':'.$sv->complaint_id);
                $sv->occurrence = $o['occurrence'] ?? null;
                $sv->penalty = $o['penalty'] ?? null;
            }))),
            'violations' => ViolationResource::collection($violationNames),
            // Precomputed for every violation this student has, keyed by
            // violation_id, so the Behavioural Analysis tab already has
            // everything it needs on page load/refresh and can call the
            // Python prediction API directly per selection instead of
            // round-tripping through a Laravel endpoint each time.
            'model_inputs' => self::getModelInputsForStudent($id),
            'violation_timelines' => self::getViolationTimelinesForStudent($id, $occurrenceByRecord),
            // Breadcrumb: "?from=<violation>" when opened from a violation's
            // student list (the middleware has already decrypted it).
            'from_violation' => self::breadcrumbViolation(request()->query('from')),
        ]);
    }

    /**
     * The Behavioural Analysis tab as a PDF (POST /student-violation/{id}/analysis-report,
     * opened in a new tab). The verdict, factors and recommendations are what
     * the page is showing (the recommendations come from the AI, so they're
     * sent rather than written again); the student and the violation's
     * timeline are read here.
     */
    public function analysisReport(Request $request, $id)
    {
        $id = decrypt_id($id) ?? abort(404);
        if (self::isSuperAdmin()) {
            abort(403);
        }
        abort_unless(self::canViewStudent($id), 403);

        $data = $request->validate([
            'violation_id' => 'required|integer',
            'prediction' => 'required|string|max:100',
            'binary' => 'nullable|integer|in:0,1',
            'insights' => 'nullable|array|max:20',
            'insights.*' => 'string|max:2000',
            'recommendations' => 'nullable|array|max:20',
            'recommendations.*' => 'string|max:3000',
        ]);

        $violation = Violation::findOrFail($data['violation_id']);
        $student = User::with(['profile', 'enrollments.program'])->findOrFail($id);
        $enrollment = $student->enrollments->sortBy('id')->last();
        $p = $student->profile;

        // "Label: explanation" -> its label and its explanation.
        $insights = collect($data['insights'] ?? [])->map(function ($f) {
            if (preg_match('/^([^:]{2,60}):\s*(.+)$/s', $f, $m)) {
                return ['label' => trim($m[1]), 'body' => ucfirst(trim($m[2]))];
            }

            return ['label' => null, 'body' => $f];
        })->all();
        // The first sentence (what to do) in bold, then the rest.
        $recommendations = collect($data['recommendations'] ?? [])->map(function ($r) {
            $r = trim($r);

            return preg_match('/^(.+?[.!?])\s+(.+)$/s', $r, $m)
                ? ['lead' => self::titleCase($m[1]), 'rest' => $m[2]]
                : ['lead' => self::titleCase($r), 'rest' => ''];
        })->all();

        // Which offense each record was and its penalty.
        $occurrence = collect(self::getStudentViolationOccurence($id))
            ->flatMap(fn ($v) => collect($v['occurrence_list'])
                ->mapWithKeys(fn ($o) => [$v['offense']['violation_id'].':'.$o['complaint_id'] => $o]));
        $timeline = ComplaintSubjectViolation::with(['complaint.complaintSubject'])
            ->where('student_id', $id)
            ->where('violation_id', $violation->id)
            ->get()
            ->map(function ($r) use ($occurrence) {
                $c = $r->complaint;
                $o = $occurrence->get($r->violation_id.':'.$r->complaint_id);
                $pen = $o['penalty'] ?? null;

                return [
                    'occurrence' => $o['occurrence'] ?? null,
                    'penalty' => $pen ? trim(($pen['ref_number'] !== null ? $pen['ref_number'].' — ' : '').ucwords(strtolower((string) ($pen['description'] ?? '')))) : null,
                    'date' => $c ? ($c->offense_issued_at ?? $c->resolved_at ?? $c->confirmed_at ?? $c->created_at) : null,
                    'case_number' => $c?->case_number,
                    'summary' => $c?->incident_summary ?: $c?->complaintSubject->first()?->incident_summary,
                ];
            })
            ->sortByDesc(fn ($t) => (string) $t['date'])
            ->values()
            ->all();

        $year = $enrollment?->year_level;
        $me = auth()->user()->loadMissing('profile')->profile;

        // The student's profile picture (if they uploaded one), embedded in the PDF.
        $photo = null;
        if (($pic = $p?->profile_picture) && is_file($path = storage_path('app/public/profile-pictures/'.basename($pic)))) {
            $mime = mime_content_type($path) ?: 'image/jpeg';
            if (in_array($mime, ['image/jpeg', 'image/png', 'image/gif', 'image/webp'])) {
                $photo = 'data:'.$mime.';base64,'.base64_encode(file_get_contents($path));
            }
        }

        $pdf = Pdf::loadView('pdf.reports.behavioural-analysis-report', [
            'violation' => $violation->violation_name,
            'student' => [
                'name' => trim(implode(' ', array_filter([$p?->first_name, $p?->middle_name, $p?->last_name]))) ?: $student->username,
                'id_number' => $student->id_number,
                'program' => $enrollment?->program?->name ?? $enrollment?->program?->code,
                'photo' => $photo,
                'year_level' => $year ?$year.(in_array($year % 100, [11, 12, 13]) ? 'th' : (['th', 'st', 'nd', 'rd'][$year % 10] ?? 'th')).' Year' : null,
            ],
            'prediction' => $data['prediction'],
            'likely' => (int) ($data['binary'] ?? 0) === 1,
            'insights' => $insights,
            'recommendations' => $recommendations,
            'timeline' => $timeline,
            'prepared_by' => trim(($me?->first_name ?? '').' '.($me?->last_name ?? '')) ?: auth()->user()->username,
        ])->setPaper('a4', 'portrait');

        // "C2210213 - 2026-11-17 - Behavioural Analysis Report.pdf"
        $idNumber = preg_replace('/[^A-Za-z0-9-]/', '', (string) $student->id_number) ?: 'student';
        return $pdf->stream("{$idNumber} - ".now()->format('Y-m-d').' - Behavioural Analysis Report.pdf');
    }

    private static function breadcrumbViolation($from)
    {
        if (! is_numeric($from) || ! ($violation = Violation::find($from))) {
            return null;
        }

        return [
            'name' => $violation->violation_name,
            'href' => '/violation-management/' . encrypt_id($violation->id) . '/students',
        ];
    }

    public function store(Request $request)
    {
        return self::multipleViolationStore($request);
    }

    /**
     * What is wrong with a resolution's subjects, or null: each needs a
     * student, at least one offense, and each offense an existing, active
     * violation (or "none", alone), with no violation listed twice.
     */
    private static function resolutionInputProblem(array $subjects): ?string
    {
        $studentIds = collect($subjects)->pluck('student_id');
        if ($studentIds->contains(fn ($id) => ! is_numeric($id))) {
            return 'Every subject must be a student.';
        }
        if ($studentIds->duplicates()->isNotEmpty()) {
            return 'A student is listed more than once.';
        }
        $students = User::whereIn('id', $studentIds)->whereRole('student')->pluck('id')->map(fn ($id) => (int) $id);
        if ($studentIds->map(fn ($id) => (int) $id)->diff($students)->isNotEmpty()) {
            return 'One of the subjects is not a student.';
        }

        $active = Violation::whereNull('archived_at')->pluck('id')->map(fn ($id) => (int) $id);
        foreach ($subjects as $i => $sub) {
            $offenses = collect($sub['offenses'] ?? [])->pluck('violation');
            $n = $i + 1;
            if ($offenses->isEmpty() || $offenses->contains(fn ($v) => $v === null || $v === '')) {
                return "Choose a violation (or \"none\") for subject {$n}.";
            }
            if ($offenses->contains('none') && $offenses->count() > 1) {
                return "Subject {$n} cannot have \"none\" together with a violation.";
            }
            $ids = $offenses->reject(fn ($v) => $v === 'none');
            if ($ids->contains(fn ($v) => ! is_numeric($v) || ! $active->contains((int) $v))) {
                return "A violation chosen for subject {$n} does not exist or has been archived.";
            }
            if ($ids->map(fn ($v) => (int) $v)->duplicates()->isNotEmpty()) {
                return "Subject {$n} has the same violation listed twice.";
            }
        }

        return null;
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
            if (! $complaint->exists()) {
                return response()->json(['message' => 'The complaint was not found.'], 404);
            }

            // Every input the resolution (and the model's training row built
            // from it) needs, checked before anything is written.
            if ($problem = self::resolutionInputProblem($subjects)) {
                DB::rollBack();

                return response()->json(['message' => $problem], 422);
            }

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
            // Being resolved now, so it includes the Incident Summary.
            $field = (new ComplaintController)->getComplaintDocumentField($complaintWithSubjects, $summary, true);
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
            ]);

            // The Early Intervention Violation Predictor's training rows: each
            // student's record for each violation as of now. Never blocks the
            // resolution (a row that can't be built is skipped and logged).
            try {
                ViolationRiskFeatures::recordComplaint((int) $complaintId);
            } catch (\Throwable $e) {
                Log::warning('Violation predictor: could not save training rows', ['complaint_id' => $complaintId, 'error' => $e->getMessage()]);
            }

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

    public function getStudentViolationOccurence($id)
    {
        if (! self::canViewStudent($id)) {
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

            $byViolation[$violationId]['violation'] = ViolationResource::make($rec->violation);
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
                    'ref_number' => $penaltyRecord->penalty->ref_number ?? null,
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

    /**
     * Route-facing entry point for GET /violation-occurence/list/{id} —
     * decrypts the id then delegates to getStudentViolationOccurence(),
     * which stays untouched because it's ALSO called directly in PHP with
     * an already-raw id by ProfileController::index() (building the
     * "Incidents" tab) — decrypting inside that shared method would break
     * that internal caller.
     */
    public function getStudentViolationOccurenceRoute($id)
    {
        return $this->getStudentViolationOccurence(decrypt_id($id) ?? abort(404));
    }

    /**
     * Thin proxy to the Python AI/ML API's /api/model/predict — the model
     * host is a private Hugging Face Space, so the browser can't call it
     * directly (it'd need the access key exposed client-side). The frontend
     * still builds the model-input row itself (already computed and handed
     * down as page props), it just posts it here instead of straight to
     * Python now.
     */
    /**
     * The model's verdict and insights for one violation (quick). The
     * Behavioural Analysis page shows these first, then asks
     * recommendViolationAction() for the slower AI recommendations.
     */
    public function predictViolationRisk(Request $request)
    {
        // The free-tier Space can cold-start, so allow some headroom.
        return self::forwardToModel($request, '/api/model/predict', 60);
    }

    /**
     * The AI-written recommendations for the same input, from Google Gemini
     * (geminiRecommendation()).
     */
    public function recommendViolationAction(Request $request)
    {
        return self::geminiRecommendation($request);
    }

    /**
     * The recommendations written by Google Gemini: the
     * page sends the verdict and insights it already got from /predict, and
     * Gemini gets the same prompt the Python service's language model uses.
     * Response: { prediction, reco: [string ...] }.
     */
    private static function geminiRecommendation(Request $request)
    {
        $data = $request->validate([
            'model_input' => 'required|array',
            'model_input.violation_type' => 'nullable|string|max:255',
            'prediction' => 'required|integer|in:0,1',
            'insights' => 'nullable|array|max:20',
            'insights.*' => 'string|max:2000',
            // "New set": write different recommendations and keep those instead.
            'refresh' => 'nullable|boolean',
        ]);
        $refresh = (bool) ($data['refresh'] ?? false);

        // A new set replaces the one everyone sees (and the report), so only
        // the prefect asks for one, a few times a minute at most (each is a
        // Gemini call).
        if ($refresh) {
            abort_unless(auth()->user()?->role === 'sub_admin', 403);
            $limitKey = 'gemini-reco-refresh:'.auth()->id();
            if (RateLimiter::tooManyAttempts($limitKey, 5)) {
                return response()->json(['message' => 'Too many new sets in a row. Please wait a minute.'], 429);
            }
            RateLimiter::hit($limitKey, 60);
        }

        $key = config('services.gemini.key');
        if (! $key) {
            return response()->json(['message' => 'Recommendation service is not configured.'], 502);
        }

        $violation = $data['model_input']['violation_type'] ?? 'the violation';
        $verdict = (int) $data['prediction'] === 1 ? 'is likely to commit it again' : 'is unlikely to commit it again';
        // Written for the Prefect of Discipline office: the advice is about
        // what the office does with the student, never about the system.
        $prompt = 'You are advising the Prefect of Discipline office of a school (Philippines). '
            ."A student has a discipline record for the violation \"{$violation}\", and based on that record the student {$verdict}. "
            .'Notes from the record: '.implode(' ', $data['insights'] ?? []).' '
            .'List exactly 10 actionable recommendations for the Prefect of Discipline on how to handle this student, '
            .'using the office\'s usual practices: talking with the student, parent or guardian conferences, coordinating with '
            .'the guidance office, advisers and teachers, follow-up meetings, monitoring the student\'s conduct and attendance, '
            .'documenting incidents in the student\'s discipline record, and sanctions under the student handbook when warranted. '
            .'Do not mention any prediction, model, AI, data, flags, scores, software or system, and never tell the student how likely they are to commit the violation again. '
            .'Number them 1 to 10. Write each one as exactly four complete sentences in one paragraph: what to do, how to carry it out, who is involved, and why it helps the student. Do not include a title/heading before the list or '
            .'a summary sentence after it — output only the numbered items, nothing else.';

        // The same analysis (same record, verdict and notes, so the same
        // prompt) always gets the same recommendations: reloading the page or
        // coming back to it shows the set already written, and the report
        // generated from it matches. A new record changes the prompt, so a
        // new set is written then.
        $cacheKey = 'gemini-reco:'.sha1(config('services.gemini.model').'|'.$prompt);
        $saved = Cache::get($cacheKey);
        if (! $refresh && is_array($saved)) {
            return response()->json(['prediction' => (int) $data['prediction'], 'reco' => $saved]);
        }
        // New set: ask for different advice than the set shown now (its titles),
        // with more variety. It is saved under the same key, replacing that set.
        $sentPrompt = $prompt;
        if ($refresh && is_array($saved) && $saved) {
            $titles = collect($saved)->map(fn ($r) => preg_split('/(?<=[.!?])\s+/', trim((string) $r), 2)[0])->implode(' | ');
            $sentPrompt .= ' Write a fresh set: different recommendations from these earlier ones, which the office has already seen: '.$titles;
        }

        try {
            $response = Http::withHeaders(['X-goog-api-key' => $key])
                // Local PHP installs often lack a CA bundle; production verifies.
                ->when(app()->isLocal(), fn ($http) => $http->withoutVerifying())
                ->timeout(60)
                // Busy (503) or rate limited (429): try again twice.
                ->retry(3, 2000, fn ($e) => $e instanceof \Illuminate\Http\Client\RequestException
                    && in_array($e->response->status(), [429, 503]), throw: false)
                ->post('https://generativelanguage.googleapis.com/v1beta/models/'.config('services.gemini.model').':generateContent', [
                    'contents' => [['parts' => [['text' => $sentPrompt]]]],
                    ...($refresh ? ['generationConfig' => ['temperature' => 1.0]] : []),
                ]);
        } catch (\Exception $e) {
            Log::error('Failed to reach Gemini for recommendations', ['error' => $e->getMessage()]);

            return response()->json(['message' => 'Recommendation service unavailable.'], 502);
        }

        if (! $response->successful()) {
            Log::error('Gemini recommendation request failed', ['status' => $response->status(), 'body' => mb_substr($response->body(), 0, 500)]);

            return response()->json(['message' => 'Recommendation service unavailable.'], 502);
        }

        $text = collect($response->json('candidates.0.content.parts') ?? [])
            ->reject(fn ($part) => $part['thought'] ?? false) // the model's reasoning, not its answer
            ->pluck('text')->implode('');
        $reco = array_slice(self::parseRecommendationList($text), 0, 10);

        // Kept for 30 days; an empty reply isn't kept, so the next load tries again.
        if ($reco) {
            Cache::put($cacheKey, $reco, now()->addDays(30));
        }

        return response()->json([
            'prediction' => (int) $data['prediction'],
            'reco' => $reco,
        ]);
    }

    /**
     * A numbered list ("1. **Title**: body ...") as one string per item:
     * wrapped lines joined, markdown bold removed. Falls back to its lines,
     * then its sentences, when the reply isn't numbered (as the Python
     * service's parser does).
     */
    /**
     * Title case for a recommendation's title: every word capitalised except
     * short joining words in the middle; words with capitals inside (PE, HR)
     * are kept. Same rule as the page (behaviour-analysis-parts.jsx titleCase).
     */
    private static function titleCase(string $text): string
    {
        $small = ['a', 'an', 'the', 'and', 'but', 'or', 'nor', 'for', 'so', 'yet', 'as', 'at', 'by', 'in', 'of', 'on', 'per', 'to', 'via'];
        $words = explode(' ', $text);
        $last = count($words) - 1;

        foreach ($words as $i => $word) {
            $parts = explode('-', $word);
            foreach ($parts as $j => $part) {
                if (! preg_match('/[A-Za-z]/', $part, $m, PREG_OFFSET_CAPTURE)) {
                    continue;
                }
                $at = $m[0][1];
                $core = substr($part, $at);
                if (preg_match('/[A-Z]/', substr($core, 1))) {
                    continue;
                }
                $inner = ! ($i === 0 && $j === 0) && $i !== $last;
                if ($inner && in_array(strtolower(preg_replace('/[^A-Za-z]/', '', $core)), $small, true)) {
                    $parts[$j] = strtolower($part);
                } else {
                    $parts[$j] = substr($part, 0, $at).ucfirst($core);
                }
            }
            $words[$i] = implode('-', $parts);
        }

        return implode(' ', $words);
    }

    private static function parseRecommendationList(string $text): array
    {
        $items = [];
        $current = null;
        foreach (preg_split('/\R/', $text) as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }
            if (preg_match('/^\d+[.)]\s*(.*)$/', $line, $m)) {
                if ($current !== null) {
                    $items[] = $current;
                }
                $current = $m[1];
            } elseif ($current !== null) {
                $current .= ' '.$line;
            }
        }
        if ($current !== null) {
            $items[] = $current;
        }

        if (! $items) {
            $items = array_values(array_filter(array_map(fn ($l) => trim($l, " -•*\t"), preg_split('/\R/', $text))));
        }
        if (count($items) <= 1 && trim($text) !== '') {
            $items = array_values(array_filter(array_map('trim', preg_split('/(?<=[.!?])\s+/', trim($text)))));
        }

        return array_values(array_filter(array_map(
            fn ($i) => trim(str_replace('**', '', $i)),
            $items
        )));
    }

    private static function forwardToModel(Request $request, string $path, int $timeout)
    {
        $request->validate([
            'model_input' => 'required|array',
        ]);

        try {
            $response = Http::withoutVerifying()
                ->withHeaders(['Authorization' => 'Bearer '.config('services.python_api.key')])
                ->timeout($timeout)
                ->post(config('services.python_api.url').$path, $request->model_input);

            if (! $response->successful()) {
                return response()->json(['message' => 'Prediction service unavailable.'], 502);
            }

            return response()->json($response->json());
        } catch (\Exception $e) {
            Log::error('Failed to reach the violation prediction API', ['path' => $path, 'error' => $e->getMessage()]);

            return response()->json(['message' => 'Prediction service unavailable.'], 502);
        }
    }

    /**
     * One model-input row per violation this student has a *resolved*
     * occurrence of, keyed by violation_id — same fields/SQL
     * getModelInput() used to compute on demand per violation, just for
     * every violation the student has at once so the frontend can send
     * these straight to Laravel's predictViolationRisk() proxy instead of
     * asking Laravel to fetch-then-forward on every violation selection.
     */
    private static function getModelInputsForStudent($studentId)
    {
        return ViolationRiskFeatures::live([$studentId])->keyBy('violation_id');
    }

    /**
     * The model-input rows for many students at once — one row per
     * (student, violation) pair with a resolved occurrence. Shared by the
     * single-student page above and the prefect's watch list, so both feed
     * the model exactly the same features (built by ViolationRiskFeatures,
     * the same code that builds the model's real training history).
     */
    public static function modelInputsForStudents($studentIds)
    {
        return ViolationRiskFeatures::live($studentIds);
    }

    /**
     * Every complaint_subject_violation row for this student, grouped by
     * violation_id — same ordering getStudentBehaviourAnalysisResult() used
     * to compute per violation (offense_issued_at falls back through the
     * complaint lifecycle timestamps), just for every violation at once.
     * Unlike getModelInputsForStudent() this isn't restricted to resolved
     * complaints, since a violation can appear in the student's selectable
     * list from a still-pending/ongoing complaint too.
     */
    private static function getViolationTimelinesForStudent($studentId, $occurrenceByRecord = null)
    {
        // Which offense each record was and its penalty ("violation:complaint" keyed).
        $occurrenceByRecord ??= collect(self::getStudentViolationOccurence($studentId))
            ->flatMap(fn ($v) => collect($v['occurrence_list'])
                ->mapWithKeys(fn ($o) => [$v['offense']['violation_id'].':'.$o['complaint_id'] => $o]));

        return ComplaintSubjectViolation::with(['violation', 'complaint.complaintSubject'])
            ->where('student_id', $studentId)
            ->orderByDesc(
                Complaint::selectRaw('COALESCE(offense_issued_at, resolved_at, confirmed_at, created_at)')
                    ->whereColumn('complaint.id', 'complaint_subject_violation.complaint_id')
                    ->limit(1)
            )
            ->get()
            ->each(function ($sv) use ($occurrenceByRecord) {
                $o = $occurrenceByRecord->get($sv->violation_id.':'.$sv->complaint_id);
                $sv->occurrence = $o['occurrence'] ?? null;
                $sv->penalty = $o['penalty'] ?? null;
            })
            ->groupBy('violation_id')
            ->map(fn ($records) => ComplaintSubjectViolationResource::collection($records));
    }
}
