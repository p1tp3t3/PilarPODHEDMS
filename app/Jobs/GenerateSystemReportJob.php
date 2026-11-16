<?php

namespace App\Jobs;

use App\Events\ReportGenerated;
use App\Exports\SystemReportExport;
use App\Http\Controllers\Modules\Report\SystemReportController;
use App\Models\Report;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Maatwebsite\Excel\Facades\Excel;

/**
 * The super admin's Report Generator: one saved filter's report (account
 * statistics / activity / setup, enrollment, action log) as a PDF or Excel.
 * Same flow as GenerateReportJob: progress broadcasts on the user's
 * channel (track id "filter-<id>"), a Report row, the file kept under
 * generated-reports/super-admin/<user>, then "ready" with its links.
 */
class GenerateSystemReportJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected string $type,
        protected array $filters,
        protected string $fileType,
        protected int $userId,
        protected ?string $trackId = null,
    ) {
        $this->onQueue('reports');
    }

    public function handle(): void
    {
        try {
            // The report's data is built as the super admin who asked for it
            // (Account Setup / Generated lists are scoped to them).
            auth()->onceUsingId($this->userId);

            $this->progress(10, 'Collecting the records');
            $title = SystemReportController::REPORT_TYPES[$this->type].' Report';
            $data = SystemReportController::reportData($this->type, $this->filters);

            $this->progress(60, $this->fileType === 'excel' ? 'Building the spreadsheet' : 'Building the PDF');
            $report = Report::create([
                'user_id' => $this->userId,
                'report_name' => $title,
                'report_type' => $this->type,
                'file_type' => $this->fileType,
                'filters' => $this->filters,
                'filters_hash' => Report::hashFilters($this->type, $this->fileType, $this->filters),
            ]);

            // The name ReportController::reportFileName() looks for.
            $path = $this->outputDir().'/'.$report->id.'-'.$this->type.'-report.'.($this->fileType === 'excel' ? 'xlsx' : 'pdf');

            if ($this->fileType === 'excel') {
                $export = new SystemReportExport($data['table']['columns'], $data['table']['rows'], $title);
                $export->sheetMeta = ['title' => $title, 'scope' => 'All Accounts', 'period' => $data['period'], 'student' => null];
                File::put($path, Excel::raw($export, \Maatwebsite\Excel\Excel::XLSX));
            } else {
                Pdf::loadView('pdf.reports.system-report', ['title' => $title] + $data)
                    ->setPaper('a4', 'landscape')
                    ->save($path);
            }

            $this->progress(90, 'Saving the file');
            $this->notify([
                'status' => 'ready',
                'percent' => 100,
                'download_url' => route('super-admin.report.download', ['id' => encrypt_id($report->id)], false),
                'view_url' => $this->fileType === 'pdf' ? route('super-admin.report.view', ['id' => encrypt_id($report->id)], false) : null,
                'file_name' => $report->readableFileName(),
                'report_id' => $report->id,
            ]);
        } catch (\Throwable $e) {
            Log::error('System report generation failed: '.$e->getMessage(), ['type' => $this->type, 'filters' => $this->filters, 'trace' => $e->getTraceAsString()]);
            $this->notify(['status' => 'failed', 'message' => 'Failed to generate the report. Please try again.']);
        }
    }

    private function notify(array $data): void
    {
        try {
            broadcast(new ReportGenerated($this->userId, $data + ['track_id' => $this->trackId]));
        } catch (\Throwable $e) {
            Log::error('Failed to broadcast report generation status: '.$e->getMessage());
        }
    }

    private function progress(int $percent, string $stage): void
    {
        $this->notify(['status' => 'progress', 'percent' => $percent, 'stage' => $stage]);
    }

    private function outputDir(): string
    {
        $dir = storage_path('app/private/generated-reports/super-admin/'.$this->userId);
        if (! File::exists($dir)) {
            File::makeDirectory($dir, 0755, true, true);
        }

        return $dir;
    }
}
