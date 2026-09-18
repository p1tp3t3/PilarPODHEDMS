<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReportFilter extends Model
{
    protected $table = 'report_filter';

    protected $fillable = ['user_id', 'report_type', 'name', 'filters'];

    protected $casts = [
        'filters' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
