<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class TardyReportExport implements FromCollection, WithEvents, WithCustomStartCell, WithMapping, WithTitle, WithHeadings, WithStyles
{
    protected $records;
    protected $title;
    protected $individual;

    public function __construct(Collection $records, string $title = 'Tardy Report', bool $individual = false)
    {
        $this->records = $records;
        $this->title = $title;
        $this->individual = $individual;
    }

    public function collection()
    {
        return $this->records;
    }

    public function headings(): array
    {
        $data = ['#'];

        if (!$this->individual) {
            $data = array_merge($data, ['Student ID', 'Name', 'Program']);
        }

        return array_merge($data, ['Reason', 'Date From', 'Date To', 'Confirmed At']);
    }

    public function map($record): array
    {
        $data = [$record['i'] ?? '—'];

        if (!$this->individual) {
            $data = array_merge($data, [
                $record['student_id'] ?? '—',
                $record['name'] ?? '—',
                $record['program'] ?? '—',
            ]);
        }

        return array_merge($data, [
            $record['reason'] ?? '—',
            $record['date_from'] ?? '—',
            $record['date_to'] ?? '—',
            $record['confirmed_at'] ?? '—',
        ]);
    }

    public function startCell(): string
    {
        return 'A2';
    }

    public function title(): string
    {
        return $this->title;
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();

                $columnCount = $this->individual ? 4 : 7;
                $lastColumn = chr(ord('A') + $columnCount - 1);

                $sheet->mergeCells("A1:{$lastColumn}1");
                $sheet->setCellValue('A1', $this->title);
                $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(16);
                $sheet->getStyle('A1')->getAlignment()->setHorizontal('center');

                foreach (range('A', $lastColumn) as $col) {
                    $sheet->getColumnDimension($col)->setAutoSize(true);
                }
            },
        ];
    }
}
