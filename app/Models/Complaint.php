<?php

namespace App\Models;

use Database\Factories\ComplaintFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

class Complaint extends Model
{
    /** @use HasFactory<ComplaintFactory> */
    use HasFactory;

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
        'school_year_semester_id',
        'confirmed_school_year_semester_id',
        'resolved_school_year_semester_id',
        'rejected_school_year_semester_id',
        'revoked_school_year_semester_id',
    ];

    protected $dates = ['created_at', 'confirmed_at'];

    // Eager-loaded on every fetch so the school year/semester tags show up
    // everywhere a complaint is listed or viewed, without every controller
    // query needing to remember to load them individually.
    protected $with = [
        'schoolYearSemester.schoolYear',
        'confirmedSchoolYearSemester.schoolYear',
        'resolvedSchoolYearSemester.schoolYear',
        'rejectedSchoolYearSemester.schoolYear',
        'revokedSchoolYearSemester.schoolYear',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'complainant_id', 'id');
    }

    public function schoolYearSemester(): BelongsTo
    {
        return $this->belongsTo(SchoolYearSemester::class);
    }

    public function confirmedSchoolYearSemester(): BelongsTo
    {
        return $this->belongsTo(SchoolYearSemester::class, 'confirmed_school_year_semester_id');
    }

    public function resolvedSchoolYearSemester(): BelongsTo
    {
        return $this->belongsTo(SchoolYearSemester::class, 'resolved_school_year_semester_id');
    }

    public function rejectedSchoolYearSemester(): BelongsTo
    {
        return $this->belongsTo(SchoolYearSemester::class, 'rejected_school_year_semester_id');
    }

    public function revokedSchoolYearSemester(): BelongsTo
    {
        return $this->belongsTo(SchoolYearSemester::class, 'revoked_school_year_semester_id');
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
