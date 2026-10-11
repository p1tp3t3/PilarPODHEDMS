<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    protected $table = 'roles';

    protected $fillable = ['name', 'label', 'is_active'];

    // Built into the app's access rules (route middleware, menus,
    // dashboards) — their `name` can't change and they can't be deleted.
    public const SYSTEM_ROLES = ['super_admin', 'sub_admin', 'student', 'teaching_staff', 'non_teaching_staff', 'parent'];

    protected static array $idCache = [];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function userRoles(): HasMany
    {
        return $this->hasMany(UserRole::class, 'role_id');
    }

    public function isSystem(): bool
    {
        return in_array($this->name, self::SYSTEM_ROLES, true);
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public static function idFor(string $name): int
    {
        return static::$idCache[$name] ??= static::where('name', $name)->valueOrFail('id');
    }
}
