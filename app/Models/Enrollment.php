<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Enrollment extends Model
{
    use HasFactory;

    public $table = 'enrollment',
           $fillable = ['student_id', 'program_id', 'school_year_id', 'semester', 'year_level', 'status', 'enrolled_at', 'dropped_at'],
           $timestamps = false;

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }

    public function program()
    {
        return $this->belongsTo(Program::class, 'program_id', 'id');
    }

    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class, 'school_year_id', 'id');
    }
}
