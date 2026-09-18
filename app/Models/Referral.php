<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;

class Referral extends Model
{
    use HasFactory;

    protected $table = 'referral';

    protected $fillable = [
        'teaching_staff_id',
        'referral_number',
        'reason_description',
        'referral_status',
        'rejected_reason',
        'rejected_at',
        'revoked_at',
        'edited_at',
        'send_to_guidance',
        'confirmed_at',
        'archived_at',
        'school_year_semester_id',
        'confirmed_school_year_semester_id',
        'rejected_school_year_semester_id',
        'revoked_school_year_semester_id',
    ];

    public $timestamps = false;

    protected $with = [
        'schoolYearSemester.schoolYear',
        'confirmedSchoolYearSemester.schoolYear',
        'rejectedSchoolYearSemester.schoolYear',
        'revokedSchoolYearSemester.schoolYear',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teaching_staff_id', 'id');
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

    public function referredStudent(): HasOneThrough
    {
        return $this->hasOneThrough(
            User::class,
            ReferralReferredStudent::class,
            'referral_id', // FK on referral_referred_student
            'id',          // FK on users
            'id',          // local key on referral
            'student_id'   // local key on referral_referred_student
        );
    }

    public function referralReferredStudent(): HasMany
    {
        return $this->hasMany(ReferralReferredStudent::class, 'referral_id', 'id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(ReferralRevision::class, 'referral_id', 'id')->latest('created_at');
    }
}
