<?php

namespace App\Models\Concerns;

use App\Models\NonTeachingStaff;
use App\Models\User;

/**
 * A complaint, referral or absent form's own PDF (complaint form, referral
 * form, absent form approval). It sits at the top of the record's folder;
 * evidences are in a subfolder and are not it.
 */
trait HasDocumentPdf
{
    /** Folder under storage/app/private holding this record's files. */
    abstract protected function documentFolder(): string;

    /** The account that filed / owns the record. */
    abstract protected function documentOwnerId(): ?int;

    /** 'complaint', 'referral' or 'absent form' (the URL's {type}). */
    abstract public function documentType(): string;

    /** The saved PDF (kept only once the record is final: resolved / approved). */
    public function documentPdfPath(): ?string
    {
        return glob(storage_path('app/private/'.$this->documentFolder()).'/*.pdf')[0] ?? null;
    }

    /**
     * The PDF built on the spot, not saved, for a record that has no saved
     * one yet (pending, rejected, revoked...). Null when this type has no
     * such PDF (an absent form's approval only exists once approved).
     */
    public function renderDocumentPdf(): ?\Barryvdh\DomPDF\PDF
    {
        return null;
    }

    /** Whether this type can build its PDF without a saved file. */
    protected function canRenderDocumentPdf(): bool
    {
        return false;
    }

    /** The prefect, the record's owner, and Guidance for referrals. */
    public function canViewPdf(?User $user): bool
    {
        if (! $user) {
            return false;
        }
        if ($user->role === 'sub_admin' || $user->id === $this->documentOwnerId()) {
            return true;
        }

        return $this->documentType() === 'referral'
            && NonTeachingStaff::where('user_id', $user->id)->first()?->position === 'Guidance';
    }

    /** URL of the page that shows the PDF, or null when there is none or the user can't open it. */
    public function pdfUrl(?User $user): ?string
    {
        if (! $this->canViewPdf($user) || (! $this->documentPdfPath() && ! $this->canRenderDocumentPdf())) {
            return null;
        }

        return '/document/pdf/'.rawurlencode($this->documentType()).'/'.encrypt_id($this->id);
    }
}
