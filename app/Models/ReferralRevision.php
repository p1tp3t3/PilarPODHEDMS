<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralRevision extends Model
{
    protected $table = 'referral_revision';

    public $timestamps = false;

    protected $fillable = [
        'referral_id',
        'reason_description',
        'students',
        'created_at',
    ];

    public function referral(): BelongsTo
    {
        return $this->belongsTo(Referral::class, 'referral_id', 'id');
    }
}
