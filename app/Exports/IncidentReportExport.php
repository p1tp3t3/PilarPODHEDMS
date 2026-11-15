<?php

namespace App\Exports;

use App\Exports\Concerns\FormalSheet;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithCustomValueBinder;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Cell\StringValueBinder;

/**
 * Incident and Violation Report spreadsheets (layout: FormalSheet; the
 * student block of an individual report comes from GenerateReportJob's
 * $sheetMeta). Values are written as text (StringValueBinder), so ID and
 * case numbers keep their leading zeros.
 */
class IncidentReportExport extends StringValueBinder implements
    FromCollection,
    WithEvents,
    WithCustomStartCell,
    WithMapping,
    WithTitle,
    WithHeadings,
    WithCustomValueBinder
{
    use FormalSheet;

    protected $records;
    protected $title;
    protected $individual;
    protected $user;
    protected $type;

    public function __construct(Collection $records, string $title = 'Incident Report', bool $individual = false, $user = null, string $type = 'violation')
    {
        $this->records = $records;
        $this->title = $title;
        $this->individual = $individual;
        $this->user = $user;
        $this->type = $type;
    }

    public function collection(): \Illuminate\Support\Enumerable
    {
        return $this->records;
    }

    public function headings(): array
    {
        if ($this->individual) {
            return $this->type === 'incident'
                ? ['No.', 'Complaint No.', 'Case No.', 'Incident', 'Complainant', 'Date and Time', 'Date Resolved', 'Violation', 'Offense', 'Penalty']
                : ['No.', 'Violation', 'Severity', 'Offense', 'Penalty', 'Date and Time'];
        }

        $data = ['No.', 'Student ID', 'Name of Student', 'Program'];

        return $this->type === 'incident'
            ? array_merge($data, ['Complainant', 'Incident Reported', 'Date and Time'])
            : array_merge($data, ['Violation', 'Severity', 'Date and Time']);
    }

    private function when($value): string
    {
        return $value ? Carbon::parse($value)->format('F j, Y g:i A') : '—';
    }

    public function map($record): array
    {
        if ($this->individual) {
            if ($this->type === 'incident') {
                return [
                    $record['i'] ?? '—',
                    $record['complaint_number'] ?? '—',
                    $record['case_number'] ?? '—',
                    $record['incident'] ?? '—',
                    $record['complainant'] ?? '—',
                    $record['date_time'] ?? '—',
                    $record['resolved_at'] ?? '—',
                    $record['violation_name'] ?? '—',
                    $record['occurrence'] ?? '—',
                    $record['penalty'] ?? '—',
                ];
            }

            return [
                $record['i'] ?? '—',
                $record['violation'] ?? '—',
                $record['status'] ?? '—',
                $record['occurrence'] ?? '—',
                $record['penalty'] ?? '—',
                $this->when($record['date_time'] ?? null),
            ];
        }

        $data = [
            $record['i'] ?? '—',
            $record['student_id'] ?? '—',
            $record['name'] ?? '—',
            $record['program'] ?? '—',
        ];

        return $this->type === 'incident'
            ? array_merge($data, [$record['complainant_name'] ?? '—', $record['incident'] ?? '—', $this->when($record['date_time'] ?? null)])
            : array_merge($data, [$record['violation'] ?? '—', $record['status'] ?? '—', $this->when($record['date_time'] ?? null)]);
    }

    public function title(): string
    {
        return mb_substr(preg_replace('/[\\\\\/?*\[\]:]+/', '-', $this->title), 0, 31);
    }
}
