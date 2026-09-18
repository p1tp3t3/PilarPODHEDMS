<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AdmisionReason extends Model
{
    protected $table = 'admission_reason';

    protected $fillable = ['admission_id', 'reason'];

    public $timestamps = false;

    public function admission(): BelongsTo
    {
        return $this->belongsTo(Admission::class, 'admission_id', 'id');
    }
}
