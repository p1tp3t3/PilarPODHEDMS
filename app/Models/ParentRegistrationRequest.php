<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ParentRegistrationRequest extends Model
{
    /** @use HasFactory<\Database\Factories\ParentRegistrationRequestFactory> */
    use HasFactory;

    public $table = 'parent_registration_request',
           $fillable = ['name', 'email', 'parent_details', 'reason'],
           $timestamps = false;
}
