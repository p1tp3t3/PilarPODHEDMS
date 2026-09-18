<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CsvImportRowResult extends Model
{
    protected $table = 'csv_import_row_results';

    public $timestamps = false;

    protected $fillable = [
        'batch_id',
        'row_index',
        'id_number',
        'full_name',
        'status',
        'message',
        'export_data',
    ];

    protected function casts(): array
    {
        return [
            'export_data' => 'array',
        ];
    }
}
