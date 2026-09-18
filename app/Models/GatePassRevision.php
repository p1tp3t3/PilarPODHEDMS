<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GatePassRevision extends Model
{
    protected $table = 'gate_pass_revision';

    public $timestamps = false;

    protected $fillable = [
        'gate_pass_id',
        'reason',
        'created_at',
    ];

    public function gatepass(): BelongsTo
    {
        return $this->belongsTo(GatePass::class, 'gate_pass_id', 'id');
    }
}
