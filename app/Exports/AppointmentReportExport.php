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

/** Appointment Report spreadsheet (layout: FormalSheet). */
class AppointmentReportExport implements FromCollection, WithEvents, WithCustomStartCell, WithMapping, WithTitle, WithHeadings
{
    use FormalSheet;

    protected $records;
    protected $title;
    protected $individual;

    public function __construct(Collection $records, string $title = 'Appointment Report', bool $individual = false)
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
            $data = array_merge($data, ['Student ID', 'Name', 'Program']);
        }

        return array_merge($data, ['Description', 'Requested Date and Time', 'Date Confirmed']);
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
            $record['description'] ?? '—',
            $record['date_time_appoint'] ?? '—',
            $record['confirmed_at'] ?? '—',
        ]);
    }

    public function title(): string
    {
        return mb_substr(preg_replace('/[\\\\\/?*\[\]:]+/', '-', $this->title), 0, 31);
    }
}
