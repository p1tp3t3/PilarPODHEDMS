<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReferralMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * Create a new message instance.
     */
    public $data;
    public function __construct($data)
    {
        $this->data = $data;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Referral Guidance Notification',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $data = $this->data;
        return new Content(
            view: 'emails.referral-email',
            with: [
                'prefect_name' => $data['prefect_name'],
                'student_names' => $data['student_names'],
                'date_issued' => $data['date_issued'],
                // Guidance / IT Staff: who the letter is addressed to.
                'office' => $data['office'] ?? 'Guidance',
                'reference' => $data['referral_number'] ?? null,
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
