<?php

namespace App\Models;

use App\Models\Concerns\HasDerivedSchoolYearSemester;
use App\Models\Concerns\HasDocumentPdf;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Absence extends Model
{
    use HasFactory, HasDerivedSchoolYearSemester, HasDocumentPdf;

    protected function documentFolder(): string
    {
        return "absent-forms/absent-form-{$this->form_number}";
    }

    protected function documentOwnerId(): ?int
    {
        return $this->student_id;
    }

    public function documentType(): string
    {
        return 'absent form';
    }

    protected function canRenderDocumentPdf(): bool
    {
        return true;
    }

    /**
     * The absent form as it stands now (not saved): the approval form once
     * approved, otherwise a plain record with its status (pending, rejected
     * with the reason, revoked). See pdf/absent-form-approval.
     */
    public function renderDocumentPdf(): ?\Barryvdh\DomPDF\PDF
    {
        $this->loadMissing(['user.profile', 'user.program', 'prefect.profile']);
        $name = fn ($p) => trim("{$p?->first_name} {$p?->middle_name} {$p?->last_name}");
        [$status, $label, $date] = match (true) {
            (bool) $this->revoked_at => ['Revoked', 'Date Revoked', $this->revoked_at],
            (bool) $this->rejected_at => ['Rejected', 'Date Rejected', $this->rejected_at],
            (bool) $this->confirmed_at => ['Approved', 'Date Approved', $this->confirmed_at],
            default => ['Pending', 'Date Submitted', $this->created_at],
        };
        $prefect = $this->prefect?->profile
            ?? User::with('profile')->whereRole('sub_admin')->first()?->profile;
        $reasons = json_decode($this->reason ?? '[]', true);

        return \Barryvdh\DomPDF\Facade\Pdf::loadView('pdf.absent-form-approval', [
            'form_number' => $this->form_number,
            'sender_name' => $name($this->user?->profile),
            'prefect_name' => $name($prefect),
            'date_from' => $this->date_from,
            'date_to' => $this->date_to,
            'reason' => is_array($reasons) ? implode(', ', $reasons) : (string) $this->reason,
            'date_approve' => $date,
            'date_label' => $label,
            'status' => $status,
            'note' => $this->note,
            'rejected_reason' => $this->rejected_reason,
            'program' => $this->user?->program?->code,
            'student_id' => $this->user?->id_number,
        ]);
    }

    protected $table = 'absent_form';


    // Always load who filed it on someone's behalf, so every list/table
    // can show "Filed By (Prefect)" without each query having to ask.
    protected $with = ['prefect.profile'];
    protected $fillable = ['form_number', 'student_id', 'prefect_id', 'reason', 'evidences', 'note', 'rejected_reason', 'rejected_at', 'confirmed_at', 'edited_at', 'revoked_at', 'date_from', 'date_to', 'archived_at'];

    public $timestamps = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(AbsenceRevision::class, 'absence_id', 'id')->latest('created_at');
    }

    // The prefect who issued this absent form directly (null when the student
    // submitted it themselves).
    public function prefect(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prefect_id', 'id');
    }
}
