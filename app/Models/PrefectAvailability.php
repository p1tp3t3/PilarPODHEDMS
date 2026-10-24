<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One time range in a prefect's weekly availability.
 * day_of_week: 1 = Monday … 6 = Saturday.
 */
class PrefectAvailability extends Model
{
    protected $table = 'prefect_availability';

    protected $fillable = ['user_id', 'day_of_week', 'start_time', 'end_time'];

    protected $casts = ['day_of_week' => 'integer'];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id', 'id');
    }
}
