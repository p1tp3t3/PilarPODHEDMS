<?php

namespace App\Http\Controllers\Modules\Report;

use App\Exports\ActionLogReportExport;
use App\Http\Controllers\Controller;
use App\Http\Resources\ActionLogResource;
use App\Jobs\GenerateReportJob;
use App\Models\Absence;
use App\Models\ActionLog;
use App\Models\Appointment;
use App\Models\Complaint;
use App\Models\ComplaintSubjectViolation;
use App\Models\ComplaintSubject;
use App\Models\GatePass;
use App\Models\Program;
use App\Models\Report;
use App\Models\SchoolYear;
use App\Models\User;
use App\Models\Violation;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class ReportController extends Controller
{
    public function index() {
        $top5Students = ComplaintSubjectViolation::select(
                                            'student_id',
                                            DB::raw('COUNT(*) as total_offenses')
                                        )
                                        ->with(['user.profile', 'user.program', 'user.enrollments'])
                                        ->whereHas('complaint', function ($q) {
                                            $q->where('complaint_status', 'resolved');
                                        })
                                        ->where(function ($q) {
                                            $q->whereNotNull('violation_id');
                                        })
                                        ->groupBy('student_id')
                                        ->orderByRaw('COUNT(*) DESC')
                                        ->take(5)
                                        ->get();




        $violation = Violation::all(['id', 'violation_name']);

        $incident = Complaint::count('incident_id');
        $incidentList = Violation::all(['id', 'violation_name']);

        $resolved = Complaint::where('complaint_status', 'resolved')->count();

        
        $incidentLineGraph = Complaint::selectRaw('MONTH(created_at) as month, COUNT(*) as total')
                                      ->whereNot('complaint_status', 'pending')
                                        ->whereYear('created_at', now()->year)
                                        ->whereMonth('created_at', '<=', now()->month)
                                        ->groupBy('month')
                                        ->orderBy('month')
                                        ->pluck('total', 'month');

        $monthlyCounts = [];

        for ($i = 1; $i <= now()->month; $i++) {
            $monthlyCounts[] = $incidentLineGraph[$i] ?? 0;
        }

        $data = DB::query()
                ->fromSub(function ($q) {

                    // 🔹 Count violations PER STUDENT first
                    $q->from('complaint_subject AS cs')
                        ->join('complaint AS c', 'c.id', '=', 'cs.complaint_id')
                        ->join('complaint_subject_violation AS cso', function ($join) {
                            $join->on('cso.complaint_id', '=', 'cs.complaint_id')
                                ->on('cso.student_id', '=', 'cs.student_id');
                        })
                        ->join('enrollment AS e', function ($join) {
                            $join->on('e.student_id', '=', 'cs.student_id')
                                ->where('e.status', '=', 'enrolled');
                        })
                        ->join('program AS p', 'p.id', '=', 'e.program_id')
                        ->select(
                            'p.name AS program',
                            'cs.student_id',
                            DB::raw('COUNT(*) AS student_violations')
                        )
                        ->groupBy('p.name', 'cs.student_id');

                }, 'student_counts')
                ->select(
                    'program',

                    // ✅ unique students with violations
                    DB::raw('COUNT(student_id) AS students_with_violations'),

                    // ✅ total = SUM of each student's violations (NO DISTINCT)
                    DB::raw('SUM(student_violations) AS total_violations')
                )
                ->groupBy('program')
                ->orderByDesc('total_violations')
                ->get();




        $violationCount = ComplaintSubjectViolation::whereNotNull('violation_id')->count();
        $resolved = Complaint::where('complaint_status', 'resolved')->count();




        return Inertia::render('prefect/report', [
            'user' => auth()->user(),
            'incident' => $incident,
            'incident_line_graph' => $monthlyCounts,
            'resolution' => 0,
            'resolved' => $resolved,
            'violation_count' => $violationCount,
            'top5_students' => $top5Students,
            'report' => self::getAllReport()
                            ->orderByDesc(
                                Complaint::select('created_at')
                                    ->whereColumn('complaint.id', 'complaint_subject.complaint_id')
                            )
                            ->paginate(request('report_per_page', 20), ['*'], 'report_page'),
            'violation_report' => self::getAllReport('violation')
                            ->orderByDesc(
                                Complaint::select('offense_issued_at')
                                    ->whereColumn('complaint.id', 'complaint_subject_violation.complaint_id')
                            )
                            ->paginate(20),
            'violation_list' => $violation,
            'incident_list' => $incidentList,
            'programs' => Program::all(['id', 'name']),
            'students' => User::with(['profile', 'program'])->where('role', 'student')->get(),
            'school_years' => SchoolYear::orderByDesc('year')->pluck('year'),
            'violation_program' => $data,
            'tardy_report' => Absence::with(['user.profile', 'user.program', 'user.enrollments'])
                            ->whereNotNull('confirmed_at')
                            ->whereJsonContains('reason', 'Excused Tardiness')
                            ->latest('confirmed_at')
                            ->get(),
            'appointment_report' => Appointment::with(['user.profile', 'user.program', 'user.enrollments'])
                            ->where('appointment_status', 'accepted')
                            ->latest('confirmed_at')
                            ->get(),
            'gatepass_report' => GatePass::with(['user.profile', 'user.program', 'user.enrollments'])
                            ->whereNotNull('confirmed_at')
                            ->latest('confirmed_at')
                            ->get(),
        ]);
    }
    public function itrcIndex() {
        return Inertia::render('itrc/report', [
            'user' => auth()->user(),
            'students' => User::with(['profile', 'program', 'teachingStaff.program', 'parent'])->get(),
            'action_log_list' => self::getAllActionLogs()
        ]);
    }
    /**
     * Report generation is queued (GenerateReportJob) instead of running
     * inline: dompdf/PhpSpreadsheet rendering blocked the request for
     * every requester, and two prefects generating a report at the same
     * moment used to overwrite the same shared public_path() file.
     */
    public function store(Request $request)
    {
        GenerateReportJob::dispatch($request->all(), auth()->id());

        return response()->json(['message' => 'queued']);
    }

    public function generateAnalyticReport(Request $request) {
        GenerateReportJob::dispatch(array_merge($request->all(), ['type' => 'analytics']), auth()->id());

        return response()->json(['message' => 'queued']);
    }

    /**
     * Lets the frontend warn "you already generated this" before queuing a
     * new job, instead of the prefect only finding out after it finishes.
     */
    public function checkDuplicateReport(Request $request) {
        $type = $request->type ?? 'incident';
        $fileType = $request->file_type ?? 'pdf';

        // Hash the raw filters (school_year, not a resolved date range) —
        // must match how GenerateReportJob hashes at dispatch time.
        $hash = Report::hashFilters($type, $fileType, $request->all());

        $existing = Report::where('user_id', auth()->id())
            ->where('filters_hash', $hash)
            ->latest('created_at')
            ->first();

        if (!$existing) {
            return response()->json(['exists' => false]);
        }

        return response()->json([
            'exists' => true,
            'report' => $existing,
            'download_url' => route('prefect.report.download', ['fileName' => $existing->file_name]),
            'view_url' => $existing->file_type === 'pdf' ? route('prefect.report.view', ['fileName' => $existing->file_name]) : null,
        ]);
    }

    public function reportHistory() {
        return Report::where('user_id', auth()->id())
            ->latest('created_at')
            ->get()
            ->map(fn ($r) => array_merge($r->toArray(), [
                'download_url' => route('prefect.report.download', ['fileName' => $r->file_name]),
                'view_url' => $r->file_type === 'pdf' ? route('prefect.report.view', ['fileName' => $r->file_name]) : null,
            ]));
    }

    public function destroyReport($id) {
        $report = Report::where('user_id', auth()->id())->findOrFail($id);

        $path = storage_path('app/private/generated-reports/' . auth()->id() . '/' . $report->file_name);
        if (file_exists($path)) {
            unlink($path);
        }

        $report->delete();

        return response()->json(['message' => 'deleted']);
    }

    /**
     * JSON preview of the analytics tab for the selected date range, so the
     * on-screen charts/tables reflect the filter (previously only the PDF
     * export honored date_from/date_to).
     */
    public function analyticsPreview(Request $request) {
        return response()->json(
            self::buildAnalyticsData($request->date_from, $request->date_to, false)
        );
    }

    /**
     * Shared by the analytics PDF job and analyticsPreview(). $withChartImage
     * skips the quickchart.io round-trip for the on-screen preview, which
     * renders its own chart client-side.
     */
    public static function buildAnalyticsData($from, $to, $withChartImage = true) {
        // === Top 5 Students ===
        $top5Students = ComplaintSubjectViolation::select(
                                            'student_id',
                                            DB::raw('COUNT(*) as total_offenses')
                                        )
                                        ->with(['user.profile', 'user.program', 'user.enrollments'])
                                        ->whereHas('complaint', function ($q) {
                                            $q->where('complaint_status', 'resolved');
                                        })
                                        ->where(function ($q) {
                                            $q->whereNotNull('violation_id');
                                        })
                                        ->groupBy('student_id')
                                        ->orderByRaw('COUNT(*) DESC')
                                        ->take(5)
                                        ->get();

        // === Violations Per Program ===
        $violationPerProgram = DB::query()
            ->fromSub(function ($q) use ($from, $to) {

                // 🔹 Count violations PER STUDENT first
                $q->from('complaint_subject AS cs')
                    ->join('complaint AS c', 'c.id', '=', 'cs.complaint_id')
                    ->join('complaint_subject_violation AS cso', function ($join) {
                        $join->on('cso.complaint_id', '=', 'cs.complaint_id')
                             ->on('cso.student_id', '=', 'cs.student_id');
                    })
                    ->join('enrollment AS e', function ($join) {
                        $join->on('e.student_id', '=', 'cs.student_id')
                            ->where('e.status', '=', 'enrolled');
                    })
                    ->join('program AS p', 'p.id', '=', 'e.program_id')
                    ->whereBetween('c.created_at', [$from, $to])
                    ->select(
                        'p.name AS program',
                        'cs.student_id',
                        DB::raw('COUNT(*) AS student_violations')
                    )
                    ->groupBy('p.name', 'cs.student_id');

            }, 'student_counts')
            ->select(
                'program',

                // ✅ unique students with violations
                DB::raw('COUNT(student_id) AS students_with_violations'),

                // ✅ total = SUM of each student's violations (NO DISTINCT)
                DB::raw('SUM(student_violations) AS total_violations')
            )
            ->groupBy('program')
            ->orderByDesc('total_violations')
            ->get();

        // === Summary Data ===

        $totalViolations = ComplaintSubjectViolation::with('complaint')
                                                  ->whereHas('complaint', fn($q) => $q->whereBetween('offense_issued_at', [$from, $to]))
                                                  ->count();

        $resolved = Complaint::where('complaint_status', 'resolved')
            ->whereBetween('created_at', [$from, $to])
            ->count();

        $incidentCount = Complaint::whereBetween('created_at', [$from, $to])->count();

        // === Incident Trend (Monthly) ===
        $incidentTrend = Complaint::selectRaw('MONTH(created_at) as month, COUNT(*) as total')
            ->whereBetween('created_at', [$from, $to])
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        $labels = $incidentTrend->pluck('month')->map(fn($m) => Carbon::createFromFormat('!m', $m)->format('M'))->toArray();
        $values = $incidentTrend->pluck('total')->toArray();

        $data = [
            'from' => $from,
            'to' => $to,
            'top5Students' => $top5Students,
            'violationPerProgram' => $violationPerProgram,
            'incidentTrend' => $incidentTrend,
            'incidentTrendLabels' => $labels,
            'incidentTrendValues' => $values,
            'totalViolations' => $totalViolations,
            'resolved' => $resolved,
            'incidentCount' => $incidentCount,
        ];

        if (!$withChartImage) {
            return $data;
        }

        // Build chart config
        $chartConfig = [
            'type' => 'line',
            'data' => [
                'labels' => $labels,
                'datasets' => [[
                    'label' => 'Monthly Incidents',
                    'data' => $values,
                    'borderColor' => '#1a237e',
                    'backgroundColor' => 'rgba(26,35,126,0.1)',
                    'fill' => true,
                    'tension' => 0.3,
                ]],
            ],
            'options' => [
                'plugins' => [
                    'legend' => ['display' => true],
                ],
                'scales' => [
                    'y' => ['beginAtZero' => true],
                ],
            ],
        ];

        // Fetch image as base64
        $chartResponse = Http::withOptions(['verify' => false])
                             ->get('https://quickchart.io/chart', ['c' => json_encode($chartConfig)]);
        $data['chartBase64'] = 'data:image/png;base64,' . base64_encode($chartResponse->body());

        return $data;
    }

    /**
     * Streams a report file generated by GenerateReportJob back to the
     * requester. Files live under a per-user folder, so this doubles as the
     * authorization check.
     */
    public function downloadReport($fileName) {
        $fileName = basename($fileName);
        $path = storage_path('app/private/generated-reports/' . auth()->id() . "/$fileName");

        if (!file_exists($path)) {
            abort(404);
        }

        // No deleteFileAfterSend — the report is kept on disk so it stays
        // downloadable/viewable from the Generated Reports history until
        // the prefect explicitly deletes it (destroyReport()).
        return response()->download($path, $fileName, [
            'Content-Type' => mime_content_type($path),
        ]);
    }

    /**
     * Inline preview (no Content-Disposition: attachment) — PDFs only, the
     * frontend doesn't offer this for Excel since browsers can't render it.
     */
    public function viewReport($fileName) {
        $fileName = basename($fileName);
        $path = storage_path('app/private/generated-reports/' . auth()->id() . "/$fileName");

        if (!file_exists($path)) {
            abort(404);
        }

        return response()->file($path, [
            'Content-Type' => mime_content_type($path),
        ]);
    }
    public function actionLogStore(Request $request) {
        $query = ActionLog::with('user.profile');

        // 🔹 Apply filters
        if ($request->report_type != 'all') {
            $query->where('action_type', $request->report_type);
        }
        $individual = (filter_var(request()->individual, FILTER_VALIDATE_BOOLEAN)) ? 1 : 0;

        if ($individual == 1) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->filled('date_from') && $request->filled('date_to')) {
            $query->whereBetween('created_at', [$request->date_from, $request->date_to]);
        } elseif ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        } elseif ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $logs = $query->latest('created_at');
        $data = [];
        $collection = [];
        if($individual != 1) {
            $i = 0;
            foreach($logs->get()->toArray() as $l) {
                $profile = $l['user']['profile'] ?? [];
                $name = ($profile['first_name'] ?? '') .  ' ' . ($profile['middle_name'] ?? '') . ' ' . ($profile['last_name'] ?? '');
                $collection[] = ($request->file_type == 'excel')
                ?
                [
                    $i + 1,
                    ucwords($l['user']['id_number'] ?? ''),
                    ucwords($name),
                    ucwords($l['user']['role'] ?? ''),
                    ucwords($l['action_type']),
                    ucwords($l['details']),
                    Carbon::parse($l['created_at'])->format('F j, Y g:i A')
                ]
                :
                [
                    'i' => $i + 1,
                    'user_id' => ucwords($l['user']['id_number'] ?? ''),
                    'name' => ucwords($name),
                    'role' => ucwords($l['user']['role'] ?? ''),
                    'action_type' => ucwords($l['action_type']),
                    'details' => ucwords($l['details']),
                    'date_time' => Carbon::parse($l['created_at'])->format('F j, Y g:i A')
                ];
                $i++;
            }
            $data = [
                'data' => $collection, 
                'from' => $request->date_from, 
                'to' => $request->date_to
            ];
        }else {
            $i = 0;
            $user = $logs->first()->toArray()['user'];
            $userProfile = $user['profile'] ?? [];
            foreach($logs->get()->toArray() as $l) {
                $collection[] = ($request->file_type == 'excel')
                ?
                [
                    $i + 1,
                    ucwords($l['action_type']),
                    ucwords($l['details']),
                    Carbon::parse($l['created_at'])->format('F j, Y g:i A')
                ]
                :
                [
                    'i' => $i + 1,
                    'action_type' => ucwords($l['action_type']),
                    'details' => ucwords($l['details']),
                    'date_time' => Carbon::parse($l['created_at'])->format('F j, Y g:i A')
                ];
                $i++;
            }
            $data = [
                'data' => $collection, 
                'from' => $request->date_from, 
                'to' => $request->date_to,
                'id' => ucwords($user['id_number'] ?? ''),
                'name' => ucwords(($userProfile['first_name'] ?? '') . ' ' . ($userProfile['middle_name'] ?? '') . ' ' . ($userProfile['last_name'] ?? '')),
                'role' => ucwords($user['role'] ?? ''),
                'civil_status' => ucwords($userProfile['civil_status'] ?? ''),
                'profile_picture' => Storage::disk('public')->path("profile-pictures/{$userProfile['profile_picture']}")
            ];
        }


        //choose file pdf or excel
        ///generate the report
        //self::getActionLogFileType($request->file_type, $request->individual, $data)
        return self::getActionLogFileType($request->file_type, ($individual == 1), $data);
    }
    public function getActionLogFileType($type, $individual, $data) {
        switch($type) {
            case 'pdf':
                $file = ($individual) ? 'individual-action-log-report' : 'action-log-report';
                $output = public_path('action-log-report.pdf');
                $pdf = Pdf::loadView("pdf.reports.$file", $data);
                $pdf->save($output);
                return response()->download($output)->deleteFileAfterSend(true);
            case 'excel':
                 $fileName = $individual
                    ? 'user-action-log-' . $data['id'] . '-' . now()->format('Ymd-His') . '.xlsx'
                    : 'action-log-all-' . now()->format('Ymd-His') . '.xlsx';

                return Excel::download(new ActionLogReportExport($data, $individual), $fileName);
        }
    }

    public function update(Request $request) {
        Report::where('id', $request->id)->update([]);
        return response()->json(self::getAllReport());
    }
    public static function getAllReport($type = 'incident')
    {
        $data = ($type == 'incident')
                ? new ComplaintSubject()
                : new ComplaintSubjectViolation();

        $data = $data->with([
            'user.profile',
            'user.program',
            'user.enrollments',
            'user.teachingStaff.program',
            'violation',
            'complaint.user',
            'complaint.violation'
        ])
        ->whereHas('complaint', function ($q) {
            $q->where('complaint_status', 'resolved')
              ->latest('created_at');
        });
        $data = $type == 'incident' ? $data->distinct('student_id') : $data->whereHas('violation', function($q) {$q->whereNot('violation_name', NULL);})->distinct('student_id');

        return $data;
    }




    public function getAllActionLogs() {
        $query = ActionLog::with('user.profile')->latest('created_at');

        if (request('action_type') && request('action_type') !== 'all') {
            $query->where('action_type', request('action_type'));
        }

        // Filter by date or date range
        if (request()->filled('date')) {
            // Single date filter
            $query->whereDate('created_at', request('date'));
        }

        return ActionLogResource::collection($query->paginate(100));
    }
    public function getReportField($request) {
        return [
            'prefect_id' => auth()->user()->id,
            'report_name' => $request->report_name,
            'report_type' => $request->report_type,
            'date_from' => $request->date_from,
            'date_to' => $request->date_to,
            'file_type' => $request->file_type,
            'description' => $request->description
        ];
    }
}
