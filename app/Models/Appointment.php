<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Appointment extends Model
{
    use HasFactory;

    public $table = 'appointment',
           $fillable = ['user_id', 'date_time_appoint', 'appointment_status', 'rejected_reason', 'confirmed_at', 'description', 'archived_at', 'school_year_semester_id'],
           $timestamps = false;

    protected $casts = [
        'date_time_appoint' => 'datetime',
    ];

    public function user() {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }

    public function schoolYearSemester() {
        return $this->belongsTo(SchoolYearSemester::class);
    }
}
