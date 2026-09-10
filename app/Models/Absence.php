<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Absence extends Model
{
    use HasFactory;

    public $table = 'absent_form',
           $fillable = ['form_number', 'student_id', 'reason', 'evidences', 'note', 'rejected_reason', 'rejected_at', 'confirmed_at', 'edited_at', 'revoked_at', 'date_from', 'date_to', 'archived_at'],
           $timestamps = false;

    public function user() {
        return $this->belongsTo(User::class, 'student_id', 'id');
    }
    public function revisions() {
        return $this->hasMany(AbsenceRevision::class, 'absence_id', 'id')->latest('created_at');
    }
}
