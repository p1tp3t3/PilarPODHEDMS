<?php

namespace App\Jobs;

use App\Events\ReportGenerated;
use App\Http\Controllers\Modules\Report\ReportController;
use App\Models\Report;
use App\Models\SchoolYear;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;

class GenerateAccountStatisticsReportJob implements ShouldQueue
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
            $filterBy = $this->filters['filter_by'] ?? 'date';
            $schoolYearId = $this->filters['school_year_id'] ?? null;
            $semester = $this->filters['semester'] ?? null;

            $data = ReportController::buildAccountStatistics(
                $filterBy,
                $this->filters['date_from'] ?? null,
                $this->filters['date_to'] ?? null,
                $schoolYearId,
                $semester
            );

            $data['school_year_label'] = $schoolYearId ? SchoolYear::where('id', $schoolYearId)->value('year') : null;
            $data['semester_label'] = match ((string) $semester) {
                '1' => '1st Semester',
                '2' => '2nd Semester',
                default => null,
            };

            $report = Report::create([
                'user_id' => $this->userId,
                'report_name' => 'Account & Enrollment Statistics Report',
                'report_type' => 'account_statistics',
                'file_type' => 'pdf',
                'filters' => $this->filters,
                'filters_hash' => Report::hashFilters('account_statistics', 'pdf', $this->filters),
            ]);

            // Deterministic name from the just-created row's own id — no
            // separate file_name column needed to find this file again.
            $fileName = "{$report->id}-account_statistics-report.pdf";
            $pdf = Pdf::loadView('pdf.reports.account-statistics-report', $data);
            $pdf->save("{$this->outputDir()}/{$fileName}");

            $this->notify([
                'status' => 'ready',
                'download_url' => route('super-admin.report.download', ['id' => $report->id]),
                'view_url' => route('super-admin.report.view', ['id' => $report->id]),
                'file_name' => $fileName,
            ]);
        } catch (\Throwable $e) {
            Log::error('Account statistics report generation failed: ' . $e->getMessage(), [
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
     * job — the report may have already been generated successfully.
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
        $dir = storage_path('app/private/generated-reports/super-admin/' . $this->userId);

        if (!File::exists($dir)) {
            File::makeDirectory($dir, 0755, true, true);
        }

        return $dir;
    }
}
