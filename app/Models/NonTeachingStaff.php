<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class NonTeachingStaff extends Model
{
    use HasFactory;

    public $table = 'non_teaching_staff',
           $fillable = ['user_id', 'position'],
           $timestamps = false;

    // user_id (the FK to users.id) is the table's own primary key — no
    // separate surrogate id column.
    protected $primaryKey = 'user_id';
    public $incrementing = false;

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
