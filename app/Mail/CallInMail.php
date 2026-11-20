<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CallInMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public $prefect_name, $student_name, $call_in_reason, $reference;
    public function __construct($data)
    {
        $this->prefect_name = $data['prefect'];
        $this->student_name = $data['student'];
        $this->call_in_reason = $data['reason'];
        // The call-in's reference number (shown under the subject).
        $this->reference = $data['reference'] ?? null;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You Have Been Issued An Office Call By The Prefect',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.call-in-email',
            with: [
                'prefect_name' => $this->prefect_name,
                'student_name' => $this->student_name,
                'call_in_reason' => $this->call_in_reason,
            ]
        );
    }

    /**
     * Get the attachments for the message.
     *
     * @return array<int, \Illuminate\Mail\Mailables\Attachment>
     */
    public function attachments(): array
    {
        return [];
    }
}
