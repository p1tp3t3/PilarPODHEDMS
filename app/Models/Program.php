<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Program extends Model
{
    use HasFactory;

    public $table = 'program',
           $fillable = ['name', 'description', 'logo', 'color_code', 'is_deleted'];
    public $timestamps = false;


    public function teachingStaff() {
        return $this->hasMany(TeachingStaff::class, 'program_id', 'id');
    }

    /**
     * The one head assigned to this program, resolved via
     * program_head_program — a head can be responsible for 2+ programs
     * (see TeachingStaff::programsHandled()), but each program still has at
     * most one head (enforced by the pivot's unique(program_id)).
     */
    public function programHead() {
        return $this->hasOneThrough(
            TeachingStaff::class,
            ProgramHeadProgram::class,
            'program_id', // FK on program_head_program referencing this program
            'user_id',    // FK on teaching_staff (its own key column)
            'id',         // local key on Program
            'user_id'     // local key on program_head_program referencing teaching_staff
        );
    }

    public function enrollments() {
        return $this->hasMany(Enrollment::class, 'program_id', 'id');
    }
}
