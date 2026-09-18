<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReferralReferredStudent extends Model
{
    use HasFactory;

    protected $table = 'referral_referred_student';

    protected $fillable = ['referral_id', 'student_id'];

    public $timestamps = false;

    public function referral(): BelongsTo
    {
        return $this->belongsTo(Referral::class, 'referral_id', 'id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }
}
