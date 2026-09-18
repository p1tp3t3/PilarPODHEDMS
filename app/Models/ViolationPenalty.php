<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ViolationPenalty extends Model
{
    use HasFactory;

    protected $fillable = ['violation_id', 'occurrence', 'penalty_id'];

    protected $table = 'violation_penalty';

    public $timestamps = false;

    public function violation(): BelongsTo
    {
        return $this->belongsTo(Violation::class, 'violation_id', 'id');
    }

    public function penalty(): BelongsTo
    {
        return $this->belongsTo(Penalty::class, 'penalty_id', 'id');
    }
}
