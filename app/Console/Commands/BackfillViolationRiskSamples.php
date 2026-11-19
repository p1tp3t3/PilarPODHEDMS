<?php

namespace App\Console\Commands;

use App\Services\ViolationRiskFeatures;
use Illuminate\Console\Command;

/**
 * Saves the Early Intervention Violation Predictor's training rows for every
 * complaint resolved before rows were saved on resolution (each at its own
 * offense date), labels the ones whose 90-day window has passed, and
 * recounts every row's interventions since its offense. Safe to run again:
 * complaints that already have rows are skipped.
 */
class BackfillViolationRiskSamples extends Command
{
    protected $signature = 'ml:backfill-samples';

    protected $description = 'Save training rows for complaints resolved before they were recorded on resolve';

    public function handle(): int
    {
        $r = ViolationRiskFeatures::backfill();

        $this->info("Complaints: {$r['complaints']}, rows saved: {$r['saved']}");
        $this->info("Labelled: {$r['labels']['repeated']} repeated, {$r['labels']['not_repeated']} did not; {$r['labels']['pending']} still within their window");
        $this->info("Intervention counts corrected: {$r['interventions_recounted']} rows");
        foreach ($r['skipped'] as $reason) {
            $this->warn("Skipped {$reason}");
        }

        return self::SUCCESS;
    }
}
