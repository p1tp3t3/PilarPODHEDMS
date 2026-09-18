<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

#[Signature('app:notify-student-violation-prediction-command')]
#[Description('Command description')]
class NotifyStudentViolationPredictionCommand extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        
    }
}
