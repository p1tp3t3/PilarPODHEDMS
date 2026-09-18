<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EducationBackground extends Model
{
    use HasFactory;

    protected $table = 'education_background';

    public $timestamps = false;

    protected $fillable = ['student_id', 'education_type', 'school_name', 'school_address', 'year_graduated', 'transferee', 'program', 'date_attended', 'year_level'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }
}
