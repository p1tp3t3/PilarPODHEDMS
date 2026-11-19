<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AbsentFormMail extends Mailable
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
            subject: 'Absent Form Mail',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $data = $this->data;
        return new Content(
            view: 'emails.absent-form-email',
             with: [
                'sender_name' => $data['sender_name'],
                'student_name' => $data['student_name'],
                'prefect_name' => $data['prefect_name'],
                'date_from' => $data['date_from'],
                'date_to' => $data['date_to'],
                'reason' => $data['reason'],
                'confirmed_at' => $data['confirmed_at'],
                'file' => $data['file'],
                'reference' => $data['form_number'] ?? null,
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
