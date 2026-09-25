<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProgramHeadCallInMail extends Mailable
{
    use Queueable, SerializesModels;

    public $program_head_name, $date_reported, $student_name, $program, $message;
    /**
     * Create a new message instance.
     */

    public function __construct($data)
    {
        $this->program_head_name = $data['program_head_name'];
        $this->student_name = $data['student_name'];
        $this->program = $data['program'];
        $this->date_reported = $data['date_reported'];
        $this->message = $data['message'] ?? null;
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Program Head Call In Mail',
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        return new Content(
            view: 'emails.program-head-student-call-in-email',
            with: [
                'program_head_name' => $this->program_head_name,
                'date_reported' => $this->date_reported,
                'student_name' => $this->student_name,
                'program' => $this->program,
                'message' => $this->message,
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
