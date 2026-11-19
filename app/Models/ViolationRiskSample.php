<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * A real training row of the Early Intervention Violation Predictor: a
 * student's record for one violation at the moment the Prefect resolved a
 * complaint, and (once known) whether they repeated it within 90 days.
 * See ViolationRiskFeatures and the create_violation_risk_samples migration.
 */
class ViolationRiskSample extends Model
{
    protected $table = 'violation_risk_samples';

    protected $guarded = ['id'];

    protected $casts = [
        'observed_at' => 'datetime',
        'labelled_at' => 'datetime',
        'will_repeat' => 'boolean',
    ];
}
