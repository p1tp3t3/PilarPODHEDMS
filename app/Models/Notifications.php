<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Notifications extends Model
{
    public $table = 'notification',
           $fillable = ['sender_id', 'receiver_id', 'notif_type', 'content', 'school_year_semester_id'],
           $timestamps = false;

    public function sender() {
        return $this->belongsTo(User::class, 'sender_id', 'id');
    }
    public function receiver() {
        return $this->belongsTo(User::class, 'receiver_id', 'id');
    }
    public function schoolYearSemester() {
        return $this->belongsTo(SchoolYearSemester::class);
    }
}
