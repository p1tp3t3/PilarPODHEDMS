<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One program a program head (program_head role) leads. A head leading
 * 2+ programs has one row per program; a program has at most one head.
 */
class ProgramHead extends Model
{
    use HasFactory;

    protected $table = 'program_head';

    // No id column: a program has at most one head, so program_id is the key.
    protected $primaryKey = 'program_id';

    public $incrementing = false;

    public $timestamps = false;

    protected $fillable = ['user_id', 'program_id'];

    // Serialized like the old head record: the position travels with it.
    protected $appends = ['position'];

    public function getPositionAttribute(): string
    {
        return 'program_head';
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id');
    }
}
