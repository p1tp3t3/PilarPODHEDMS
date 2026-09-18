<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AppointmentSlot extends Model
{
    protected $table = 'appointment_slot';

    protected $fillable = ['date_available', 'maximum_slots'];

    public function appointment(): HasMany
    {
        return $this->hasMany(Appointment::class, 'appointment_slot_id', 'id');
    }
}
