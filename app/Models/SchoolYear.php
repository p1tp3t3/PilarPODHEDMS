<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolYear extends Model
{
    use HasFactory;

    public $table = 'school_year',
           $fillable = ['year', 'activate'];

    public function enrollments()
    {
        return $this->hasMany(Enrollment::class, 'school_year_id', 'id');
    }
}
