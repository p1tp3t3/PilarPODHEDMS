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

/**
 * A super admin report's table as a spreadsheet (layout: FormalSheet):
 * `columns` [{field, label}] and `rows` (arrays) from SystemReportController.
 */
class SystemReportExport implements FromCollection, WithEvents, WithCustomStartCell, WithMapping, WithTitle, WithHeadings
{
    use FormalSheet;

    protected Collection $records;

    public function __construct(protected array $columns, array $rows, protected string $title)
    {
        $this->records = collect($rows)->values()->map(fn ($r, $i) => ['__i' => $i + 1] + $r);
    }

    public function collection(): \Illuminate\Support\Enumerable
    {
        return $this->records;
    }

    public function headings(): array
    {
        return array_merge(['No.'], array_column($this->columns, 'label'));
    }

    public function map($record): array
    {
        return array_merge(
            [$record['__i']],
            array_map(fn ($c) => ($record[$c['field']] ?? null) === null || $record[$c['field']] === '' ? '—' : (string) $record[$c['field']], $this->columns)
        );
    }

    public function title(): string
    {
        return mb_substr(preg_replace('/[\\\\\/?*\[\]:]+/', '-', $this->title), 0, 31);
    }
}
