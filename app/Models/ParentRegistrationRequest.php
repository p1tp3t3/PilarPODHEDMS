<?php

namespace App\Models;

use Database\Factories\ParentRegistrationRequestFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ParentRegistrationRequest extends Model
{
    /** @use HasFactory<ParentRegistrationRequestFactory> */
    use HasFactory;

    protected $table = 'parent_registration_request';

    protected $fillable = ['name', 'email', 'parent_details', 'reason'];

    public $timestamps = false;
}
