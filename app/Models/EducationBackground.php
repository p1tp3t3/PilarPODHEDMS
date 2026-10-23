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

    // A student's current (non-transferee) college is always this school —
    // fixed, never taken from user input.
    public const CURRENT_SCHOOL_NAME = 'Pilar College of Zamboanga City Inc';
    public const CURRENT_SCHOOL_ADDRESS = 'R.T. Lim Boulevard, Cawa Cawa, Zamboanga City';

    protected $fillable = ['student_id', 'education_type', 'school_name', 'school_address', 'year_graduated', 'transferee', 'program', 'date_attended', 'year_level'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }
}
