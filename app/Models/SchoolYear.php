<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolYear extends Model
{
    use HasFactory;

    public $table = 'school_year',
           $fillable = ['year', 'activate'];

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'school_year_id', 'id');
    }

    public function semesters()
    {
        return $this->hasMany(SchoolYearSemester::class, 'school_year_id')->orderBy('semester');
    }

    public function activeSemester()
    {
        return $this->hasOne(SchoolYearSemester::class, 'school_year_id')->where('is_active', true);
    }
}
