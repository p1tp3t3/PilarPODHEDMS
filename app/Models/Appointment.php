<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Appointment extends Model
{
    use HasFactory;

    protected $table = 'appointment';

    protected $fillable = ['appointment_number', 'user_id', 'date_time_appoint', 'appointment_status', 'attendance_status', 'rejected_reason', 'confirmed_at', 'description', 'archived_at'];

    public $timestamps = false;

    // A cancelled appointment is kept (the prefect's calendar shows it as
    // Cancelled) but left out of every other list, count and reminder.
    // Include it with Appointment::withoutGlobalScope('not_cancelled').
    protected static function booted(): void
    {
        static::addGlobalScope('not_cancelled', fn ($q) => $q->where($q->qualifyColumn('appointment_status'), '!=', 'cancelled'));
    }

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

    public function schoolYearSemester(): ?SchoolYearSemester
    {
        return SchoolYearSemester::forDate($this->created_at);
    }
}
