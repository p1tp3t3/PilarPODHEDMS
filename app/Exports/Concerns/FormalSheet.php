<?php

namespace App\Exports\Concerns;

use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Worksheet\PageSetup;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * The formal layout every report spreadsheet shares (GenerateReportJob sets
 * $sheetMeta): the school letterhead, the report title with its scope and
 * period, the student block for an individual report (with photo), then the
 * table (navy header, borders, light banding, frozen header) and the
 * total. Printing: landscape, one page wide, the
 * header row repeated, page numbers in the footer.
 *
 * An export using it implements FromCollection, WithHeadings, WithMapping,
 * WithCustomStartCell and WithEvents, and stores its rows in $records.
 *
 * $sheetMeta: title, scope, period, student (null, or
 * [name, id_number, program, photo_path]).
 */
trait FormalSheet
{
    public array $sheetMeta = [];

    /** The student's photo, placed after the column widths are set. */
    private ?Drawing $photo = null;

    private const NAVY = '1F3A5F';
    private const BAND = 'F4F6F9';
    private const LINE = 'C3CCD8';

    /** Row of the table's header (letterhead + student block above it). */
    protected function tableHeaderRow(): int
    {
        return ! empty($this->sheetMeta['student']) ? 12 : 8;
    }

    public function startCell(): string
    {
        return 'A'.$this->tableHeaderRow();
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => fn (AfterSheet $event) => $this->formalize($event->sheet->getDelegate()),
        ];
    }

    private function formalize(Worksheet $sheet): void
    {
        $meta = $this->sheetMeta;
        $columns = max(count($this->headings()), 4);
        $last = Coordinate::stringFromColumnIndex($columns);
        $head = $this->tableHeaderRow();
        $rows = count($this->records ?? []);
        $end = $head + max($rows, 1);
        $sheet->getParent()->getDefaultStyle()->getFont()->setName('Calibri')->setSize(11);
        $sheet->setShowGridlines(false);

        // ---- letterhead ----
        $lines = [
            1 => ['Pilar College of Zamboanga City, Inc.', 15, true, self::NAVY],
            2 => ['R.T. Lim Boulevard, Zamboanga City, 7000 · College Department', 10, false, '444444'],
            3 => ['OFFICE OF STUDENT AFFAIRS AND DISCIPLINE', 11, true, self::NAVY],
            4 => [mb_strtoupper($meta['title'] ?? $this->title()), 14, true, '111111'],
            5 => trim(implode('  ·  ', array_filter([$meta['scope'] ?? null, $meta['period'] ?? null]))) ?: null,
            6 => 'Generated on '.now()->format('F j, Y \a\t g:i A'),
        ];
        foreach ($lines as $row => $line) {
            if ($line === null) {
                continue;
            }
            [$text, $size, $bold, $color] = is_array($line) ? $line : [$line, 10, false, '555555'];
            $sheet->mergeCells("A{$row}:{$last}{$row}");
            $sheet->setCellValue("A{$row}", $text);
            $sheet->getStyle("A{$row}")->applyFromArray([
                'font' => ['size' => $size, 'bold' => $bold, 'color' => ['rgb' => $color]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            ]);
        }
        $sheet->getRowDimension(1)->setRowHeight(24);
        $sheet->getRowDimension(4)->setRowHeight(24);
        // a navy rule under the office line
        $sheet->getStyle("A3:{$last}3")->getBorders()->getBottom()->setBorderStyle(Border::BORDER_MEDIUM)->getColor()->setRGB(self::NAVY);

        // ---- the student (individual report) ----
        if ($student = $meta['student'] ?? null) {
            // With a photo: the photo first (columns A:B over the block's
            // three rows), then the labels and values. Without one, the labels
            // take A:B (the first column, "No.", is narrow).
            $photo = $student['photo_path'] ?? null;
            $hasPhoto = $photo && is_file($photo);
            $col = fn ($i) => Coordinate::stringFromColumnIndex($i);
            $labelFrom = $hasPhoto ? 3 : 1;
            $labelTo = $hasPhoto ? ($columns >= 7 ? 4 : 3) : 2;
            $valueFrom = $labelTo + 1;
            $valueTo = $hasPhoto ? $columns : max($valueFrom, $columns - 2);

            $info = [8 => ['Name of Student', $student['name'] ?? '—'], 9 => ['ID Number', $student['id_number'] ?? '—'], 10 => ['Program and Year', $student['program'] ?? '—']];
            foreach ($info as $row => [$label, $value]) {
                $lf = $col($labelFrom).$row;
                if ($labelTo > $labelFrom) {
                    $sheet->mergeCells("{$lf}:".$col($labelTo).$row);
                }
                $sheet->setCellValue($lf, $label);
                $vf = $col($valueFrom).$row;
                if ($valueTo > $valueFrom) {
                    $sheet->mergeCells("{$vf}:".$col($valueTo).$row);
                }
                $sheet->setCellValueExplicit($vf, (string) $value, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);
                $sheet->getStyle($lf)->applyFromArray(['font' => ['bold' => true, 'color' => ['rgb' => '333333']], 'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E8EDF3']]]);
                $range = "{$lf}:".$col($valueTo).$row;
                $sheet->getStyle($range)->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB(self::LINE);
                $sheet->getStyle($range)->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
                $sheet->getRowDimension($row)->setRowHeight(22);
            }

            if ($hasPhoto) {
                // Centered in A:B over rows 8-10 (~7px per width unit).
                $sheet->mergeCells('A8:B10');
                $sheet->getStyle('A8:B10')->getBorders()->getOutline()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB(self::LINE);
                $d = new Drawing;
                $d->setPath($photo);
                $d->setName('Student');
                $d->setResizeProportional(true);
                $d->setHeight(80);
                $d->setCoordinates('A8');
                $this->photo = $d; // placed once the column widths are known
            }
        }

        // ---- the table ----
        $sheet->getStyle("A{$head}:{$last}{$head}")->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => self::NAVY]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
        ]);
        $sheet->getRowDimension($head)->setRowHeight(24);

        if ($rows === 0) {
            $sheet->mergeCells("A".($head + 1).":{$last}".($head + 1));
            $sheet->setCellValue('A'.($head + 1), 'No records for the selected filters.');
            $sheet->getStyle('A'.($head + 1))->getFont()->setItalic(true);
        }
        $sheet->getStyle("A{$head}:{$last}{$end}")->applyFromArray([
            'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => self::LINE]]],
        ]);
        // An empty value reads as "—", not a blank cell.
        for ($r = $head + 1; $rows && $r <= $end; $r++) {
            for ($c = 1; $c <= count($this->headings()); $c++) {
                $cell = $sheet->getCell(Coordinate::stringFromColumnIndex($c).$r);
                if (trim((string) $cell->getValue()) === '') {
                    $cell->setValue('—');
                }
            }
        }
        // Values are text on purpose (leading zeros): no "number stored as text" flags.
        for ($r = $head + 1; $rows && $r <= $end; $r++) {
            for ($c = 1; $c <= $columns; $c++) {
                $sheet->getCell(Coordinate::stringFromColumnIndex($c).$r)->getIgnoredErrors()->setNumberStoredAsText(true);
            }
        }
        $sheet->getStyle('A'.($head + 1).":{$last}{$end}")->getAlignment()->setVertical(Alignment::VERTICAL_TOP)->setWrapText(true);
        $sheet->getStyle('A'.($head + 1).":A{$end}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
        for ($r = $head + 2; $r <= $end; $r += 2) {
            $sheet->getStyle("A{$r}:{$last}{$r}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::BAND);
        }
        $sheet->freezePane('A'.($head + 1));

        // Column widths from the content (merged title rows defeat auto-size).
        for ($c = 1; $c <= $columns; $c++) {
            $col = Coordinate::stringFromColumnIndex($c);
            $longest = 0;
            for ($r = $head; $r <= $end; $r++) {
                $longest = max($longest, mb_strlen((string) $sheet->getCell("{$col}{$r}")->getValue()));
            }
            $sheet->getColumnDimension($col)->setWidth($c === 1 ? max(6, min($longest + 2, 18)) : max(12, min($longest + 3, 45)));
        }

        // The logo just left of the centered school name (its position from
        // the column widths: ~7px per width unit, ~9px per title letter).
        $logo = public_path('default-pic/pilar-pdf.png');
        if (is_file($logo)) {
            $px = fn ($c) => (int) round($sheet->getColumnDimension(Coordinate::stringFromColumnIndex($c))->getWidth() * 7 + 5);
            $total = 0;
            for ($c = 1; $c <= $columns; $c++) {
                $total += $px($c);
            }
            $left = max(0, (int) ($total / 2 - (mb_strlen('Pilar College of Zamboanga City, Inc.') * 9) / 2 - 62));
            $col = 1;
            while ($col < $columns && $left >= $px($col)) {
                $left -= $px($col);
                $col++;
            }
            $d = new Drawing;
            $d->setPath($logo);
            $d->setName('Pilar College');
            $d->setHeight(54);
            $d->setCoordinates(Coordinate::stringFromColumnIndex($col).'1');
            $d->setOffsetX(min($left, max(0, $px($col) - 10)));
            $d->setOffsetY(4);
            $d->setWorksheet($sheet);
        }

        if ($this->photo) {
            $boxPx = 0;
            foreach (['A', 'B'] as $c) {
                $boxPx += (int) round($sheet->getColumnDimension($c)->getWidth() * 7 + 5);
            }
            $this->photo->setOffsetX(max(2, (int) (($boxPx - $this->photo->getWidth()) / 2)));
            $this->photo->setOffsetY(3);
            $this->photo->setWorksheet($sheet);
        }

        // ---- total ----
        $total = $end + 2;
        $sheet->setCellValue("A{$total}", 'Total records: '.$rows);
        $sheet->mergeCells("A{$total}:".Coordinate::stringFromColumnIndex(min(3, $columns))."{$total}");
        $sheet->getStyle("A{$total}")->getFont()->setBold(true);

        // ---- printing ----
        $setup = $sheet->getPageSetup();
        $setup->setOrientation(PageSetup::ORIENTATION_LANDSCAPE)->setPaperSize(PageSetup::PAPERSIZE_A4)
            ->setFitToWidth(1)->setFitToHeight(0)->setRowsToRepeatAtTopByStartAndEnd($head, $head);
        $sheet->getPageMargins()->setTop(0.5)->setBottom(0.6)->setLeft(0.4)->setRight(0.4);
        $sheet->getHeaderFooter()->setOddFooter('&L&8'.($meta['title'] ?? '').'&R&8Page &P of &N');
        $sheet->getPageSetup()->setPrintArea("A1:{$last}{$total}");
        $sheet->setSelectedCell('A'.($head + 1));
    }
}
