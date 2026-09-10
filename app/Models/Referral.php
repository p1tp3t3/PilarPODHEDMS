<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Referral extends Model
{
    use HasFactory;

    public $table = 'referral',
           $fillable = [
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
           ],
           $timestamps = false;

    public function user() {
        return $this->belongsTo(User::class, 'teaching_staff_id', 'id');
    }
    public function referredStudent() {
        return $this->hasOneThrough(
            User::class,
            ReferralReferredStudent::class,
            'referral_id', // FK on referral_referred_student
            'id',          // FK on users
            'id',          // local key on referral
            'student_id'   // local key on referral_referred_student
        );
    }
    public function referralReferredStudent() {
        return $this->hasMany(ReferralReferredStudent::class, 'referral_id', 'id');
    }
    public function revisions() {
        return $this->hasMany(ReferralRevision::class, 'referral_id', 'id')->latest('created_at');
    }
}
