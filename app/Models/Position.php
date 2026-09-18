<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Position extends Model
{
    use HasFactory;

    protected $fillable = ['name'];

    /**
     * Several places filter teaching_staff/non_teaching_staff by a fixed
     * position name ('program_head', 'Guard', 'Guidance', ...) — this
     * resolves that name to the row's id once per request instead of every
     * call site repeating its own Position::where('name', ...)->value('id').
     */
    private static array $idCache = [];

    public static function idFor(string $name): ?int
    {
        return self::$idCache[$name] ??= self::where('name', $name)->value('id');
    }
}
