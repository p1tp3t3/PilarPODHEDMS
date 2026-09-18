<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notifications extends Model
{
    protected $table = 'notification';

    protected $fillable = ['sender_id', 'receiver_id', 'notif_type', 'content', 'school_year_semester_id'];

    public $timestamps = false;

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id', 'id');
    }

    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'receiver_id', 'id');
    }

    public function schoolYearSemester(): BelongsTo
    {
        return $this->belongsTo(SchoolYearSemester::class);
    }
}
