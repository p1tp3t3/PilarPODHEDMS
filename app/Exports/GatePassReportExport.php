<?php

namespace App\Exports;

use App\Exports\Concerns\FormalSheet;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;

/** Gate Pass Report spreadsheet (layout: FormalSheet). */
class GatePassReportExport implements FromCollection, WithEvents, WithCustomStartCell, WithMapping, WithTitle, WithHeadings
{
    use FormalSheet;

    protected $records;
    protected $title;
    protected $individual;

    public function __construct(Collection $records, string $title = 'Gate Pass Report', bool $individual = false)
    {
        $this->records = $records;
        $this->title = $title;
        $this->individual = $individual;
    }

    public function collection(): \Illuminate\Support\Enumerable
    {
        return $this->records;
    }

    public function headings(): array
    {
        $data = ['No.'];

        if (! $this->individual) {
            $data = array_merge($data, ['Student ID', 'Name of Student', 'Program']);
        }

        return array_merge($data, ['Reason', 'Allowed To', 'Valid Until', 'Date Confirmed']);
    }

    public function map($record): array
    {
        $data = [$record['i'] ?? '—'];

        if (! $this->individual) {
            $data = array_merge($data, [
                $record['student_id'] ?? '—',
                $record['name'] ?? '—',
                $record['program'] ?? '—',
            ]);
        }

        return array_merge($data, [
            $record['reason'] ?? '—',
            $this->allowedTo($record['allow_to'] ?? null),
            $record['date_expiration'] ?? '—',
            $record['confirmed_at'] ?? '—',
        ]);
    }

    // "Go Out, With Companion" (stored as a JSON list like ["go-out"]).
    private function allowedTo($value): string
    {
        $list = is_string($value) ? (json_decode($value, true) ?? [$value]) : (array) $value;

        return collect($list)->filter()
            ->map(fn ($v) => ['go-out' => 'Go Out', 'enter' => 'Enter'][$v] ?? ucwords(str_replace(['-', '_'], ' ', (string) $v)))
            ->implode(', ') ?: '—';
    }

    public function title(): string
    {
        return mb_substr(preg_replace('/[\\\\\/?*\[\]:]+/', '-', $this->title), 0, 31);
    }
}
