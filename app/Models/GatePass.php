<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class GatePass extends Model
{
    use HasFactory;

    public $table = 'gate_pass',
           $fillable = [
               'gatepass_number', 'user_id', 'reason', 'allow_to', 'confirmed_at', 'date_expiration',
               'rejected_reason', 'rejected_at', 'revoked_at', 'edited_at', 'archived_at',
               'school_year_semester_id',
               'confirmed_school_year_semester_id', 'rejected_school_year_semester_id', 'revoked_school_year_semester_id',
           ],
           $timestamps = false;

    protected $with = [
        'schoolYearSemester.schoolYear',
        'confirmedSchoolYearSemester.schoolYear',
        'rejectedSchoolYearSemester.schoolYear',
        'revokedSchoolYearSemester.schoolYear',
    ];

    public function user() {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function revisions() {
        return $this->hasMany(GatePassRevision::class, 'gate_pass_id', 'id');
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
