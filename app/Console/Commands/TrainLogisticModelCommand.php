<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

#[Signature('app:train-logistic-model-command')]
#[Description('Retrains the early-intervention (logistic) violation-risk model on the Python API.')]
class TrainLogisticModelCommand extends Command
{
    /**
     * Hits the private Python ML Space the same way the violation dataset
     * sync calls do (see MaintenanceController) — a Bearer token is required
     * at the Space's own infrastructure level, before the request even
     * reaches Flask.
     */
    public function handle(): void
    {
        $response = Http::withoutVerifying()
            ->withHeaders(['Authorization' => 'Bearer '.config('services.python_api.key')])
            ->timeout(120)
            ->post(config('services.python_api.url').'/python/model/train');

        if ($response->failed()) {
            $this->error('Failed to train the logistic model: '.$response->body());

            return;
        }

        $this->info($response->json('message', 'Model trained successfully.'));
    }
}
