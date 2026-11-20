<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * An office call: the Prefect called a student in (NotificationController
 * notifyCallIn), with its reference number (call_in_number) and whether the
 * student came (attendance_status).
 */
class CallIn extends Model
{
    protected $table = 'call_in';

    public $timestamps = false;

    protected $guarded = ['id'];
}
