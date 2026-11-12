<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ParentRejectMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $parentName,
        public string $reason,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your Parent Registration Request');
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.parent-reject-email',
            with: ['parentName' => $this->parentName, 'reason' => $this->reason],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
