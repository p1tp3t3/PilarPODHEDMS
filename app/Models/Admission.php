<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Admission extends Model
{
    protected $table = 'admission';

    protected $fillable = ['student_id', 'confirmed'];

    public $timestamps = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id', 'user_id');
    }

    public function admissionReason(): HasMany
    {
        return $this->hasMany(AdmisionReason::class, 'admission_id', 'id');
    }
}
