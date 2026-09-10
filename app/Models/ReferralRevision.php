<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReferralRevision extends Model
{
    public $table = 'referral_revision',
           $timestamps = false;

    public $fillable = [
        'referral_id',
        'reason_description',
        'students',
        'created_at',
    ];

    public function referral()
    {
        return $this->belongsTo(Referral::class, 'referral_id', 'id');
    }
}
