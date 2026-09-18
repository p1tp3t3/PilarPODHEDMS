<?php

namespace App\Jobs;

use App\Events\ReportGenerated;
use App\Exports\AppointmentReportExport;
use App\Exports\GatePassReportExport;
use App\Exports\IncidentReportExport;
use App\Exports\TardyReportExport;
use App\Http\Controllers\Modules\Report\ReportController;
use App\Models\Absence;
use App\Models\Appointment;
use App\Models\Complaint;
use App\Models\ComplaintSubjectViolation;
use App\Models\GatePass;
use App\Models\User;
use App\Models\ViolationPenalty;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpWord\TemplateProcessor;

class GenerateReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $filters;
    protected $userId;

    public function __construct(array $filters, $userId)
    {
        $this->filters = $filters;
        $this->userId = $userId;
    }

    public function handle(): void
    {
        try {
            $type = $this->filters['type'] ?? 'incident';
            $fileType = $this->filters['file_type'] ?? 'pdf';

            // Hash the filters as submitted (school_year, not a resolved
            // date range) — resolving school_year to a live date range uses
            // NOW() as the upper bound for a still-active year, which would
            // never hash the same way twice and defeat duplicate detection.
            $hash = \App\Models\Report::hashFilters($type, $fileType, $this->filters);

            $this->filters = \App\Models\Report::resolveSchoolYearDates($this->filters);

            $result = $type === 'analytics'
                ? $this->buildAnalyticsFile()
                : $this->buildListReportFile($type);

            $report = \App\Models\Report::create([
                'user_id' => $this->userId,
                'report_name' => ($this->filters['report_name'] ?? '') ?: (ucfirst($type) . ' Report'),
                'report_type' => $type,
                'file_type' => $fileType,
                'filters' => $this->filters,
                'filters_hash' => $hash,
            ]);

            $fileName = $this->finalizeFileName($report, $result['fileName']);
            $isPdf = str_ends_with($fileName, '.pdf');

            $this->notify([
                'status' => 'ready',
                'download_url' => route('prefect.report.download', ['id' => $report->id]),
                'view_url' => $isPdf ? route('prefect.report.view', ['id' => $report->id]) : null,
                'file_name' => $fileName,
                'report_id' => $report->id,
            ]);
        } catch (\App\Exceptions\EmptyReportException $e) {
            $this->notify([
                'status' => 'failed',
                'message' => $e->getMessage(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Report generation failed: ' . $e->getMessage(), [
                'filters' => $this->filters,
                'trace' => $e->getTraceAsString(),
            ]);

            $this->notify([
                'status' => 'failed',
                'message' => 'Failed to generate report. Please try again.',
            ]);
        }
    }

    /**
     * A broadcast failure (e.g. Reverb unreachable) must never fail this
     * job — the report may have already been generated successfully, and
     * failing here would just retry-regenerate it needlessly.
     */
    private function notify(array $data): void
    {
        try {
            broadcast(new ReportGenerated($this->userId, $data));
        } catch (\Throwable $e) {
            Log::error('Failed to broadcast report generation status: ' . $e->getMessage());
        }
    }

    private function outputDir(): string
    {
        $dir = storage_path('app/private/generated-reports/sub-admin/' . $this->userId);

        if (!File::exists($dir)) {
            File::makeDirectory($dir, 0755, true, true);
        }

        return $dir;
    }

    /**
     * The file is built under a throwaway UUID name before the Report row
     * exists (buildAnalyticsFile/writeFile don't know its id yet), then
     * renamed to a deterministic {id}-{type}-report.{ext} once it does —
     * so download/view/delete can reconstruct the path from the Report row
     * alone instead of needing a stored file_name column.
     */
    private function finalizeFileName($report, string $originalFileName): string
    {
        $ext = pathinfo($originalFileName, PATHINFO_EXTENSION);
        $fileName = "{$report->id}-{$report->report_type}-report.{$ext}";
        $dir = $this->outputDir();

        if ($originalFileName !== $fileName && file_exists("{$dir}/{$originalFileName}")) {
            rename("{$dir}/{$originalFileName}", "{$dir}/{$fileName}");
        }

        return $fileName;
    }

    private function buildAnalyticsFile(): array
    {
        $from = $this->filters['date_from'];
        $to = $this->filters['date_to'];

        $data = ReportController::buildAnalyticsData($from, $to, true);

        $pdf = Pdf::loadView('pdf.reports.analytic-report', $data);
        $fileName = Str::uuid() . '-analytics-report.pdf';
        $pdf->save($this->outputDir() . "/{$fileName}");

        return ['fileName' => $fileName];
    }

    private function buildListReportFile(string $type): array
    {
        $filters = $this->filters;
        $fileType = $filters['file_type'] ?? 'pdf';
        $individual = filter_var($filters['individual'] ?? false, FILTER_VALIDATE_BOOLEAN);

        [$rows, $student] = match ($type) {
            'incident', 'violation' => $this->buildIncidentOrViolationRows($type, $individual),
            'tardy' => $this->buildTardyRows($individual),
            'appointment' => $this->buildAppointmentRows($individual),
            'gatepass' => $this->buildGatePassRows($individual),
            default => throw new \InvalidArgumentException("Unknown report type: {$type}"),
        };

        if (empty($rows)) {
            throw new \App\Exceptions\EmptyReportException(
                'No records found for the selected filters. Nothing was generated.'
            );
        }

        $collection = $individual ? ['data' => $rows, 'student' => $student] : $rows;

        return $this->writeFile($type, $fileType, $collection, $individual);
    }

    private function baseRow(bool $individual, int $id, $user): array
    {
        if ($individual) {
            return ['i' => $id];
        }

        $profile = $user->profile;

        return [
            'i' => $id,
            'student_id' => $user->id_number,
            'name' => trim(($profile->first_name ?? '') . ' ' . ($profile->middle_name ?? '') . ' ' . ($profile->last_name ?? '')),
            'program' => $user->program->name ?? '',
        ];
    }

    private function individualStudent(bool $individual)
    {
        if (!$individual) {
            return null;
        }

        return User::with(['profile', 'program'])->where('id', $this->filters['student_id'])->first();
    }

    private function applyProgramFilter($query, bool $individual, string $enrollmentsRelation = 'user.enrollments')
    {
        $filters = $this->filters;

        if ($individual) {
            return $query;
        }

        if (!empty($filters['program']) && $filters['program'] !== 'all') {
            $query->whereHas($enrollmentsRelation, fn ($q) => $q->where('program_id', $filters['program']));
        }

        return $query;
    }

    private function buildIncidentOrViolationRows(string $type, bool $individual): array
    {
        $isIncident = $type === 'incident';
        $filters = $this->filters;

        // An individual student's incident report groups by the incident
        // itself, since one incident can carry two or more violations —
        // each with its own occurrence count and penalty at the time.
        if ($isIncident && $individual) {
            return $this->buildIndividualIncidentRows();
        }

        $query = ReportController::getAllReport($type)
            ->whereHas('complaint', function ($q) use ($filters, $isIncident) {
                $q->whereBetween($isIncident ? 'complaint.created_at' : 'complaint.offense_issued_at', [$filters['date_from'], $filters['date_to']]);
            });

        if ($individual) {
            $query->where('student_id', $filters['student_id']);
        } else {
            $this->applyProgramFilter($query, false);
        }

        if (($filters['report_type'] ?? 'all') !== 'all') {
            if ($isIncident) {
                $query->whereHas('complaint', fn ($q) => $q->where('complaint.incident_id', $filters['report_type']));
            } else {
                $query->whereHas('violation', fn ($q) => $q->where('violation.id', $filters['report_type']));
            }
        }

        $query = $isIncident
            ? $query->orderByDesc(Complaint::select('created_at')->whereColumn('complaint.id', 'complaint_subject.complaint_id'))
            : $query->orderByDesc(Complaint::select('offense_issued_at')->whereColumn('complaint.id', 'complaint_subject_violation.complaint_id'));

        $records = $query->get();

        // For an individual student's violation report, show which
        // occurrence each violation was and the penalty that applied.
        $occurrences = ($individual && !$isIncident)
            ? $this->studentViolationOccurrences($filters['student_id'])
            : collect();

        $rows = [];
        $i = 0;

        foreach ($records as $inc) {
            $id = ++$i;
            $reportedSince = $isIncident
                ? Carbon::parse($inc->complaint->created_at)->format('F j, Y g:i A')
                : Carbon::parse($inc->complaint->offense_issued_at)->format('F j, Y g:i A');

            $base = $this->baseRow($individual, $id, $inc->user);

            if ($isIncident) {
                $rows[] = array_merge($base, [
                    'complainant_name' => !is_null($inc->complaint->user)
                        ? trim($inc->complaint->user->profile->first_name . ' ' . $inc->complaint->user->profile->middle_name . ' ' . $inc->complaint->user->profile->last_name)
                        : $inc->complaint->complainant_name,
                    'incident' => $inc->complaint->violation?->violation_name,
                    'date_time' => $reportedSince,
                ]);
                continue;
            }

            $occurrenceRow = $occurrences->get("{$inc->complaint_id}:{$inc->violation_id}");

            $rows[] = array_merge($base, [
                'violation' => $inc->violation->violation_name,
                'status' => $inc->violation->offense_status ? 'Major' : 'Minor',
                'date_time' => $reportedSince,
            ], $individual ? [
                'occurrence' => $occurrenceRow?->occurrence ?? '-',
                'penalty' => $occurrenceRow ? $this->penaltyDescriptionFor($inc->violation_id, $occurrenceRow->occurrence) : 'No Penalty',
            ] : []);
        }

        return [$rows, $this->individualStudent($individual)];
    }

    /**
     * Every resolved violation this student has ever had, numbered by
     * occurrence (1st, 2nd, ...) per violation type in chronological
     * order — the same ladder ViolationController::getStudentViolationOccurence
     * tallies, but keeping every individual event instead of just the
     * final count, keyed by "complaint_id:violation_id" (complaint_subject_violation
     * has no id column of its own).
     */
    private function studentViolationOccurrences($studentId)
    {
        $violations = ComplaintSubjectViolation::with(['violation', 'complaint.violation', 'complaint.user.profile'])
            ->where('student_id', $studentId)
            ->whereNotNull('violation_id')
            ->whereHas('complaint', fn ($q) => $q->where('complaint_status', 'resolved'))
            ->get()
            ->sortBy(fn ($v) => $v->complaint->offense_issued_at ?? $v->complaint->created_at)
            ->values();

        $counts = [];

        return $violations->map(function ($v) use (&$counts) {
            $counts[$v->violation_id] = ($counts[$v->violation_id] ?? 0) + 1;
            $v->occurrence = $counts[$v->violation_id];

            return $v;
        })->keyBy(fn ($v) => "{$v->complaint_id}:{$v->violation_id}");
    }

    /**
     * Penalties can stack (2+ per occurrence, see ViolationSeeder's escalation
     * ladder) so this returns every penalty attached to the highest rung
     * reached at or below the given occurrence, not just one.
     */
    private function penaltyDescriptionFor($violationId, $occurrence): string
    {
        $maxOccurrence = ViolationPenalty::where('violation_id', $violationId)
            ->where('occurrence', '<=', $occurrence)
            ->max('occurrence');

        if (!$maxOccurrence) {
            return 'No Penalty';
        }

        $descriptions = ViolationPenalty::with('penalty')
            ->where('violation_id', $violationId)
            ->where('occurrence', $maxOccurrence)
            ->get()
            ->pluck('penalty.description')
            ->filter();

        return $descriptions->isEmpty() ? 'No Penalty' : $descriptions->implode(', ');
    }

    /**
     * Base this on ComplaintSubject (same scoping as ReportController::
     * getAllReport('incident')) rather than ComplaintSubjectViolation —
     * a resolved incident doesn't necessarily have a violation formally
     * attached yet, and building the incident list *from* violations was
     * silently dropping every incident that had none.
     */
    private function buildIndividualIncidentRows(): array
    {
        $filters = $this->filters;
        $studentId = $filters['student_id'];
        $studentIdNumber = $this->individualStudent(true)?->id_number;
        $reportType = $filters['report_type'] ?? 'all';

        $subjects = \App\Models\ComplaintSubject::with(['complaint.violation', 'complaint.user.profile'])
            ->where('student_id', $studentId)
            ->whereHas('complaint', fn ($q) => $q->where('complaint_status', 'resolved'))
            ->get()
            ->filter(function ($cs) use ($filters, $reportType) {
                $date = $cs->complaint->offense_issued_at ?? $cs->complaint->created_at;

                if ($date < $filters['date_from'] || $date > $filters['date_to']) {
                    return false;
                }

                return $reportType === 'all' || $cs->complaint->incident_id == $reportType;
            });

        if ($subjects->isEmpty()) {
            return [[], $this->individualStudent(true)];
        }

        // Chronological occurrence numbering (for penalty lookups) grouped
        // by the complaint each violation belongs to — an incident with no
        // violations attached simply gets an empty list here.
        $violationsByComplaint = $this->studentViolationOccurrences($studentId)->values()->groupBy('complaint_id');

        $incidents = $subjects
            ->sortBy(fn ($cs) => $cs->complaint->offense_issued_at ?? $cs->complaint->created_at)
            ->values()
            ->map(function ($cs, $index) use ($studentIdNumber, $violationsByComplaint) {
                $complaint = $cs->complaint;
                $date = $complaint->offense_issued_at ?? $complaint->created_at;
                $complainantProfile = $complaint->user?->profile;

                return [
                    'i' => $index + 1,
                    'student_id' => $studentIdNumber,
                    'complaint_number' => $complaint->complaint_number,
                    'case_number' => $complaint->case_number,
                    'incident' => $complaint->violation?->violation_name,
                    'complainant' => $complainantProfile
                        ? trim("{$complainantProfile->first_name} {$complainantProfile->last_name}")
                        : ($complaint->complainant_name ?: 'Anonymous'),
                    'date_time' => Carbon::parse($date)->format('F j, Y g:i A'),
                    'resolved_at' => $complaint->resolved_at ? Carbon::parse($complaint->resolved_at)->format('F j, Y g:i A') : '-',
                    'summary' => $complaint->incident_summary ?? $cs->incident_summary ?? '',
                    'violations' => $violationsByComplaint->get($cs->complaint_id, collect())->map(fn ($v) => [
                        'violation_name' => $v->violation?->violation_name,
                        'occurrence' => $v->occurrence,
                        'penalty' => $this->penaltyDescriptionFor($v->violation_id, $v->occurrence),
                    ])->values()->all(),
                ];
            })
            ->values()
            ->all();

        return [$incidents, $this->individualStudent(true)];
    }

    private function buildTardyRows(bool $individual): array
    {
        $filters = $this->filters;

        $query = Absence::with(['user.profile', 'user.program'])
            ->whereNotNull('confirmed_at')
            ->whereJsonContains('reason', 'Excused Tardiness')
            ->whereBetween('confirmed_at', [$filters['date_from'], $filters['date_to']]);

        if ($individual) {
            $query->where('student_id', $filters['student_id']);
        } else {
            $this->applyProgramFilter($query, false);
        }

        $records = $query->latest('confirmed_at')->get();

        $rows = [];
        $i = 0;

        foreach ($records as $r) {
            $id = ++$i;
            $reasons = implode(', ', json_decode($r->reason, true) ?? []);

            $rows[] = array_merge($this->baseRow($individual, $id, $r->user), [
                'reason' => $reasons,
                'date_from' => $r->date_from ? Carbon::parse($r->date_from)->format('F j, Y') : '-',
                'date_to' => $r->date_to ? Carbon::parse($r->date_to)->format('F j, Y') : '-',
                'confirmed_at' => Carbon::parse($r->confirmed_at)->format('F j, Y g:i A'),
            ]);
        }

        return [$rows, $this->individualStudent($individual)];
    }

    private function buildAppointmentRows(bool $individual): array
    {
        $filters = $this->filters;

        $query = Appointment::with(['user.profile', 'user.program'])
            ->where('appointment_status', 'accepted')
            ->whereBetween('confirmed_at', [$filters['date_from'], $filters['date_to']]);

        if ($individual) {
            $query->where('user_id', $filters['student_id']);
        } else {
            $this->applyProgramFilter($query, false);
        }

        $records = $query->latest('confirmed_at')->get();

        $rows = [];
        $i = 0;

        foreach ($records as $r) {
            $id = ++$i;

            $rows[] = array_merge($this->baseRow($individual, $id, $r->user), [
                'description' => $r->description,
                'date_time_appoint' => $r->date_time_appoint ? Carbon::parse($r->date_time_appoint)->format('F j, Y g:i A') : '-',
                'confirmed_at' => $r->confirmed_at ? Carbon::parse($r->confirmed_at)->format('F j, Y g:i A') : '-',
            ]);
        }

        return [$rows, $this->individualStudent($individual)];
    }

    private function buildGatePassRows(bool $individual): array
    {
        $filters = $this->filters;

        $query = GatePass::with(['user.profile', 'user.program'])
            ->whereNotNull('confirmed_at')
            ->whereBetween('confirmed_at', [$filters['date_from'], $filters['date_to']]);

        if ($individual) {
            $query->where('user_id', $filters['student_id']);
        } else {
            $this->applyProgramFilter($query, false);
        }

        $records = $query->latest('confirmed_at')->get();

        $rows = [];
        $i = 0;

        foreach ($records as $r) {
            $id = ++$i;

            $rows[] = array_merge($this->baseRow($individual, $id, $r->user), [
                'reason' => $r->reason,
                'allow_to' => $r->allow_to,
                'date_expiration' => $r->date_expiration ? Carbon::parse($r->date_expiration)->format('F j, Y g:i A') : '-',
                'confirmed_at' => Carbon::parse($r->confirmed_at)->format('F j, Y g:i A'),
            ]);
        }

        return [$rows, $this->individualStudent($individual)];
    }

    private function writeFile(string $type, string $fileType, $collection, bool $individual): array
    {
        $filters = $this->filters;
        $outputDir = $this->outputDir();
        $reportName = ($filters['report_name'] ?? '') ?: (ucfirst($type) . ' Report');
        $uid = Str::uuid();

        if ($fileType === 'word') {
            if (!in_array($type, ['incident', 'violation'])) {
                throw new \InvalidArgumentException('Word export is only available for incident/violation reports.');
            }

            $template = new TemplateProcessor(public_path('docs/INCIDENT-REPORT-FORMAT_OVER-ALL.docx'));
            $template->setValue('report_title', $reportName);

            $rows = $individual ? $collection['data'] : $collection;
            $template->cloneRow('name', max(count($rows), 1));

            foreach ($rows as $index => $row) {
                $r = $index + 1;
                foreach ($row as $key => $value) {
                    $template->setValue("{$key}#{$r}", $value);
                }
            }

            $fileName = "{$uid}-{$type}-report.docx";
            $outputPath = "{$outputDir}/{$fileName}";
            $template->saveAs($outputPath);

            if (!file_exists($outputPath) || filesize($outputPath) === 0) {
                throw new \Exception("DOCX file was not generated correctly: {$outputPath}");
            }

            return ['fileName' => $fileName];
        }

        if ($fileType === 'excel') {
            $fileName = "{$uid}-{$type}-report.xlsx";
            Excel::store(
                $this->makeExport($type, $collection, $reportName, $individual),
                "generated-reports/sub-admin/{$this->userId}/{$fileName}",
                'local'
            );

            return ['fileName' => $fileName];
        }

        // pdf (default)
        $fileName = "{$uid}-{$type}-report.pdf";
        $pdf = $this->makePdf($type, $collection, $reportName, $individual);
        $pdf->save("{$outputDir}/{$fileName}");

        return ['fileName' => $fileName];
    }

    private function makePdf(string $type, $collection, string $reportName, bool $individual)
    {
        $filters = $this->filters;
        $reportFile = in_array($type, ['incident', 'violation'])
            ? ($individual ? 'individual-student-incident-report' : 'incident-report')
            : "{$type}-report";

        $props = $individual ? $this->individualPdfProps($collection) : ['data' => $collection];

        return Pdf::loadView("pdf.reports.$reportFile", array_merge($props, [
            'report_title' => $reportName,
            'from' => $filters['date_from'],
            'to' => $filters['date_to'],
            'school_year' => $filters['school_year'] ?? null,
            'type' => $type,
            'individual' => $individual,
        ]));
    }

    private function individualPdfProps($collection): array
    {
        $student = $collection['student'];
        $profile = $student->profile;

        return [
            'student_name' => trim(($profile->first_name ?? '') . ' ' . ($profile->middle_name ?? '') . ' ' . ($profile->last_name ?? '')),
            'student_id' => $student->id_number,
            'profile_picture' => !empty($profile->profile_picture) ? Storage::disk('public')->path("profile-pictures/{$profile->profile_picture}") : null,
            'program' => $student->program->description ?? $student->program->name ?? '',
            'civil_status' => $profile->civil_status ?? '',
            'data' => $collection['data'],
        ];
    }

    private function makeExport(string $type, $collection, string $reportName, bool $individual)
    {
        $rows = $individual ? $collection['data'] : $collection;

        if (in_array($type, ['incident', 'violation'])) {
            $studentArray = $individual ? $this->studentExportArray($collection['student']) : null;

            // Excel is row-per-record; an individual incident report's rows
            // are nested (one incident -> 2+ violations), so flatten to one
            // row per violation, repeating the incident's own columns.
            if ($type === 'incident' && $individual) {
                $rows = collect($rows)->flatMap(function ($incident) {
                    // An incident with no violation formally attached must
                    // still produce a row — flatMap-ing straight over an
                    // empty violations array would drop it entirely.
                    $violations = empty($incident['violations'])
                        ? [['violation_name' => 'No violation charged', 'occurrence' => '-', 'penalty' => '-']]
                        : $incident['violations'];

                    return collect($violations)->map(fn ($v) => [
                        'i' => $incident['i'],
                        'student_id' => $incident['student_id'],
                        'complaint_number' => $incident['complaint_number'],
                        'case_number' => $incident['case_number'],
                        'incident' => $incident['incident'],
                        'complainant' => $incident['complainant'],
                        'date_time' => $incident['date_time'],
                        'resolved_at' => $incident['resolved_at'],
                        'violation_name' => $v['violation_name'],
                        'occurrence' => $v['occurrence'],
                        'penalty' => $v['penalty'],
                    ]);
                })->values()->all();
            }

            return new IncidentReportExport(collect($rows), $reportName, $individual, $studentArray, $type);
        }

        return match ($type) {
            'tardy' => new TardyReportExport(collect($rows), $reportName, $individual),
            'appointment' => new AppointmentReportExport(collect($rows), $reportName, $individual),
            'gatepass' => new GatePassReportExport(collect($rows), $reportName, $individual),
        };
    }

    private function studentExportArray($student): array
    {
        $profile = $student->profile;

        return [
            'id' => $student->id_number,
            'first_name' => $profile->first_name ?? '',
            'middle_name' => $profile->middle_name ?? '',
            'last_name' => $profile->last_name ?? '',
            'civil_status' => $profile->civil_status ?? '',
            'profile_picture' => $profile->profile_picture ?? null,
            'student' => ['program' => ['name' => $student->program->name ?? '']],
        ];
    }
}
