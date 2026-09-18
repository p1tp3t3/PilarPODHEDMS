<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProgramHeadProgram extends Model
{
    public $table = 'program_head_program',
           $fillable = ['user_id', 'program_id'];

    public function teachingStaff()
    {
        return $this->belongsTo(TeachingStaff::class, 'user_id', 'user_id');
    }

    public function program()
    {
        return $this->belongsTo(Program::class, 'program_id');
    }
}
