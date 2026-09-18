<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Absence extends Model
{
    use HasFactory;

    public $table = 'absent_form',
           $fillable = ['form_number', 'student_id', 'reason', 'evidences', 'note', 'rejected_reason', 'rejected_at', 'confirmed_at', 'edited_at', 'revoked_at', 'date_from', 'date_to', 'archived_at', 'school_year_semester_id', 'confirmed_school_year_semester_id', 'rejected_school_year_semester_id', 'revoked_school_year_semester_id'],
           $timestamps = false;

    protected $with = [
        'schoolYearSemester.schoolYear',
        'confirmedSchoolYearSemester.schoolYear',
        'rejectedSchoolYearSemester.schoolYear',
        'revokedSchoolYearSemester.schoolYear',
    ];

    public function user() {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }
    public function revisions() {
        return $this->hasMany(AbsenceRevision::class, 'absence_id', 'id')->latest('created_at');
    }
    public function schoolYearSemester() {
        return $this->belongsTo(SchoolYearSemester::class);
    }
    public function confirmedSchoolYearSemester() {
        return $this->belongsTo(SchoolYearSemester::class, 'confirmed_school_year_semester_id');
    }
    public function rejectedSchoolYearSemester() {
        return $this->belongsTo(SchoolYearSemester::class, 'rejected_school_year_semester_id');
    }
    public function revokedSchoolYearSemester() {
        return $this->belongsTo(SchoolYearSemester::class, 'revoked_school_year_semester_id');
    }
}
