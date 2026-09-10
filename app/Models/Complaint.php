<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Carbon\Carbon;

class Complaint extends Model
{
    /** @use HasFactory<\Database\Factories\ComplaintFactory> */
    use HasFactory;

    public $table = 'complaint',
           $timestamps = false;

    public $fillable = [
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

    public function user() {
        return $this->belongsTo(User::class, 'complainant_id', 'id');
    }
    public function subject() {
        return $this->hasOneThrough(
            User::class,
            ComplaintSubject::class,
            'complaint_id', // FK on complaint_subject
            'id',           // FK on users
            'id',           // local key on complaint
            'student_id'    // local key on complaint_subject
        );
    }
    public function complaintSubject() {
        return $this->hasMany(ComplaintSubject::class, 'complaint_id', 'id');
    }
    public function complaintSubjectViolation() {
        return $this->hasMany(ComplaintSubjectViolation::class, 'complaint_id', 'id');
    }
    public function violation() {
        return $this->belongsTo(Violation::class, 'incident_id', 'id');
    }
    public function complaintEvidenceFile() {
        return $this->hasMany(ComplaintEvidenceFile::class, 'complaint_case_number', 'case_number');
    }
    public function revisions() {
        return $this->hasMany(ComplaintRevision::class, 'complaint_id', 'id')->latest('created_at');
    }
}
