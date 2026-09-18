<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProgramHeadProgram extends Model
{
    protected $table = 'program_head_program';

    protected $fillable = ['user_id', 'program_id'];

    public function teachingStaff(): BelongsTo
    {
        return $this->belongsTo(TeachingStaff::class, 'user_id', 'user_id');
    }

    public function program(): BelongsTo
    {
        return $this->belongsTo(Program::class, 'program_id');
    }
}
