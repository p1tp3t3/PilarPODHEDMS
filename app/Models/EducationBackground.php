<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class EducationBackground extends Model
{
    use HasFactory;

    public $table = 'education_background';
    public $timestamps = false;
    public $fillable = ['student_id', 'education_type', 'school_name', 'school_address', 'year_graduated', 'transferee', 'program', 'date_attended', 'year_level'];

    public function user() {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }
}
