<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Writes python-api/dataset/violation_levels.csv: every violation and the
 * highest offense level its penalty ladder defines (1–6). The ML dataset
 * generator uses it so no training row repeats a violation more times than
 * the school's rules allow. Re-run after violations or penalties change.
 */
class ExportViolationLevels extends Command
{
    protected $signature = 'ml:export-violations';

    protected $description = 'Export each violation and its maximum offense level for the ML dataset generator';

    public function handle(): int
    {
        $rows = DB::table('violation as v')
            ->leftJoin('violation_penalty as vp', 'vp.violation_id', '=', 'v.id')
            ->groupBy('v.id', 'v.violation_name')
            ->orderBy('v.id')
            ->selectRaw('v.violation_name, MAX(vp.occurrence) AS max_level')
            ->get();

        $path = base_path('python-api/dataset/violation_levels.csv');
        $out = fopen($path, 'w');
        fputcsv($out, ['violation_type', 'max_level']);
        foreach ($rows as $row) {
            // A violation with no penalties defined yet falls back to the global maximum.
            fputcsv($out, [trim($row->violation_name), max(1, min(6, (int) ($row->max_level ?: 6)))]);
        }
        fclose($out);

        $this->info("Wrote {$rows->count()} violations to {$path}");

        return self::SUCCESS;
    }
}
