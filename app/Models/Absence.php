<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Absence extends Model
{
    use HasFactory;

    protected $table = 'absent_form';

    protected $fillable = ['form_number', 'student_id', 'reason', 'evidences', 'note', 'rejected_reason', 'rejected_at', 'confirmed_at', 'edited_at', 'revoked_at', 'date_from', 'date_to', 'archived_at', 'school_year_semester_id', 'confirmed_school_year_semester_id', 'rejected_school_year_semester_id', 'revoked_school_year_semester_id'];

    public $timestamps = false;

    protected $with = [
        'schoolYearSemester.schoolYear',
        'confirmedSchoolYearSemester.schoolYear',
        'rejectedSchoolYearSemester.schoolYear',
        'revokedSchoolYearSemester.schoolYear',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(AbsenceRevision::class, 'absence_id', 'id')->latest('created_at');
    }

    public function schoolYearSemester(): BelongsTo
    {
        return $this->belongsTo(SchoolYearSemester::class);
    }

    public function confirmedSchoolYearSemester(): BelongsTo
    {
        return $this->belongsTo(SchoolYearSemester::class, 'confirmed_school_year_semester_id');
    }

    public function rejectedSchoolYearSemester(): BelongsTo
    {
        return $this->belongsTo(SchoolYearSemester::class, 'rejected_school_year_semester_id');
    }

    public function revokedSchoolYearSemester(): BelongsTo
    {
        return $this->belongsTo(SchoolYearSemester::class, 'revoked_school_year_semester_id');
    }
}
