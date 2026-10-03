<?php

namespace App\Models;

use App\Models\Concerns\HasDerivedSchoolYearSemester;
use Database\Factories\ComplaintFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

class Complaint extends Model
{
    /** @use HasFactory<ComplaintFactory> */
    use HasFactory, HasDerivedSchoolYearSemester;

    protected $table = 'complaint';

    public $timestamps = false;

    protected $fillable = [
        'complaint_number',
        'case_number',
        'complainant_id',
        'complainant_name',
        'incident_id',
        'complaint_description',
        'incident_summary',
        'complaint_evidences',
        'rejected_reason',
        'rejected_at',
        'revoked_at',
        'edited_at',
        'confirmed_at',
        'offense_issued_at',
        'complaint_status',
        'resolved_at',
        'archived_at',
    ];

    protected $dates = ['created_at', 'confirmed_at'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'complainant_id', 'id');
    }

    // resolved_at itself is never actually set when a complaint transitions
    // to 'resolved' (see ViolationController) — offense_issued_at is what
    // gets stamped at that exact moment instead, so it's the faithful
    // basis for "which semester was this resolved in".
    public function resolvedSchoolYearSemester(): ?SchoolYearSemester
    {
        return SchoolYearSemester::forDate($this->offense_issued_at);
    }

    public function subject(): HasOneThrough
    {
        return $this->hasOneThrough(
            User::class,
            ComplaintSubject::class,
            'complaint_id', // FK on complaint_subject
            'id',           // FK on users
            'id',           // local key on complaint
            'student_id'    // local key on complaint_subject
        );
    }

    public function complaintSubject(): HasMany
    {
        return $this->hasMany(ComplaintSubject::class, 'complaint_id', 'id');
    }

    public function complaintSubjectViolation(): HasMany
    {
        return $this->hasMany(ComplaintSubjectViolation::class, 'complaint_id', 'id');
    }

    public function violation(): BelongsTo
    {
        return $this->belongsTo(Violation::class, 'incident_id', 'id');
    }

    public function complaintEvidenceFile(): HasMany
    {
        return $this->hasMany(ComplaintEvidenceFile::class, 'complaint_case_number', 'case_number');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(ComplaintRevision::class, 'complaint_id', 'id')->latest('created_at');
    }
}
