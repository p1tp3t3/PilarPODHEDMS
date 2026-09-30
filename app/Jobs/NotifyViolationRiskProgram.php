<?php

namespace App\Jobs;

use App\Mail\ViolationRiskMail;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Mail;

class NotifyViolationRiskProgram implements ShouldQueue
{
    use Queueable;

    /**
     * Create a new job instance.
     */
    public $email, $data;
    public function __construct($email, $data)
    {
        $this->email = $email;
        $this->data = $data;
        $this->onQueue('notifications');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        Mail::to($this->email)
            ->send(new ViolationRiskMail($this->data));
    }
}
