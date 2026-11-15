<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithDrawings;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use Illuminate\Support\Facades\Storage;

class ActionLogReportExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithDrawings, WithCustomStartCell
{
    protected $logs, $individual, $user;

    public function __construct(array $logs, $individual)
    {
        $this->logs = collect($logs['data']);
        $this->user = $individual
            ? array_filter($logs, fn($key) => $key !== 'data', ARRAY_FILTER_USE_KEY)
            : null;
        $this->individual = $individual;
    }

    public function collection(): \Illuminate\Support\Enumerable
    {
        return $this->logs;
    }

    public function headings(): array
    {
        return $this->individual
            ? ['#', 'Action Type', 'Details', 'Date / Time']
            : ['#', 'ID', 'User', 'Role', 'Action Type', 'Details', 'Date / Time'];
    }

    public function startCell(): string
    {
        // For individual report, logs start at row 9
        return $this->individual ? 'A9' : 'A1';
    }

    public function map($log): array
    {
        if ($this->individual) {
            return [
                $log[0] . '.',
                $log[1],
                $log[2] ?? 'N/A',
                $log[3],
            ];
        }

        return [
            $log[0] . '.',
            $log[1],
            $log[2] ?? 'N/A',
            $log[3],
            $log[4] ?? '—',
            $log[5],
            $log[6]
        ];
    }

    public function styles(Worksheet $sheet): ?array
    {
        if ($this->individual && !is_null($this->user)) {
            $sheet->setCellValue('A1', 'User ID:');
            $sheet->setCellValue('B1', $this->user['id'] ?? 'N/A');

            $sheet->setCellValue('A2', 'Name:');
            $sheet->setCellValue('B2', $this->user['name'] ?? 'N/A');

            $sheet->setCellValue('A3', 'Role:');
            $sheet->setCellValue('B3', ucfirst($this->user['role'] ?? 'N/A'));

            $sheet->setCellValue('A4', 'Civil Status:');
            $sheet->setCellValue('B4', ucfirst($this->user['civil_status'] ?? 'N/A'));

            $sheet->getStyle('A1:A4')->getFont()->setBold(true);

            $sheet->mergeCells('A7:D7');
            $sheet->setCellValue('A7', 'Action Logs');
            $sheet->getStyle('A7')->getFont()->setBold(true)->setSize(12);
        }

        foreach (range('A', 'F') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        return [];
    }

    public function drawings(): \PhpOffice\PhpSpreadsheet\Worksheet\BaseDrawing|array
    {
        if (!$this->individual || empty($this->user['profile_picture'])) {
            return [];
        }

        $picturePath = "profile-pictures/" . $this->user['profile_picture'];

        if (!Storage::disk('public')->exists($picturePath)) {
            return [];
        }

        $imagePath = Storage::disk('public')->path($picturePath);

        $drawing = new Drawing();
        $drawing->setName('Profile Picture');
        $drawing->setDescription('User profile picture');
        $drawing->setPath($imagePath);
        $drawing->setHeight(90);
        $drawing->setCoordinates('E1');
        $drawing->setOffsetX(10);
        $drawing->setOffsetY(5);

        return [$drawing];
    }
}
