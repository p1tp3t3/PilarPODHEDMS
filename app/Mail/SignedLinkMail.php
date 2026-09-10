<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * Generic "click this link" email, shared by password reset and parent
 * registration confirmation — both send a temporarySignedRoute() link and
 * only differ in wording, so one Mailable/view covers both instead of two
 * near-identical ones.
 */
class SignedLinkMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $mailSubject,
        public string $heading,
        public string $description,
        public string $url,
        public string $buttonLabel,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->mailSubject);
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.signed-link',
            with: [
                'heading' => $this->heading,
                'description' => $this->description,
                'url' => $this->url,
                'buttonLabel' => $this->buttonLabel,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
