<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appointment extends Model
{
    use HasFactory;

    protected $table = 'appointment';

    protected $fillable = ['user_id', 'date_time_appoint', 'appointment_status', 'attendance_status', 'rejected_reason', 'confirmed_at', 'description', 'archived_at', 'school_year_semester_id'];

    public $timestamps = false;

    protected function casts(): array
    {
        return [
            'date_time_appoint' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function schoolYearSemester(): BelongsTo
    {
        return $this->belongsTo(SchoolYearSemester::class);
    }
}
