<?php

namespace App\Http\Controllers\Modules\System;

use App\Http\Controllers\Controller;
use App\Models\ActionLog;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;

/**
 * Super admin role management. Role names are fixed once created. A role that any user has ever held (current
 * or past, via user_roles) can only be toggled active/inactive — deleting
 * it would orphan that history. A role with no linked users can be deleted.
 */
class RoleController extends Controller
{
    public function index()
    {
        return Inertia::render('itrc/roles', [
            'roles' => self::list(),
        ]);
    }

    public static function list()
    {
        return Role::withCount([
            'userRoles as linked_count',
            'userRoles as current_users_count' => fn ($q) => $q->whereRaw(
                'user_roles.id = (select max(ur2.id) from user_roles as ur2 where ur2.user_id = user_roles.user_id)'
            ),
        ])
            ->orderBy('id')
            ->get()
            ->each(fn (Role $r) => $r->is_system = $r->isSystem());
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'label' => 'required|string|max:60',
        ]);

        $name = Str::slug($data['label'], '_');
        if ($name === '' || Role::where('name', $name)->exists()) {
            return response()->json(['message' => 'A role with this name already exists.'], 422);
        }

        $role = Role::create(['name' => $name, 'label' => $data['label'], 'is_active' => true]);
        ActionLog::log(auth()->id(), 'account update', "Added the role {$role->label}");

        return response()->json(['message' => 'Role added successfully.', 'roles' => self::list()]);
    }

    public function toggle($id)
    {
        $role = Role::findOrFail($id);

        if ($role->name === 'super_admin' && $role->is_active) {
            return response()->json(['message' => 'The IT Admin role cannot be deactivated.'], 422);
        }

        $role->update(['is_active' => ! $role->is_active]);
        ActionLog::log(
            auth()->id(),
            'account update',
            ($role->is_active ? 'Activated' : 'Deactivated')." the role {$role->label}",
            ['is_active' => ['from' => ! $role->is_active, 'to' => $role->is_active]]
        );

        return response()->json(['message' => 'Role '.($role->is_active ? 'activated' : 'deactivated').' successfully.', 'roles' => self::list()]);
    }

    public function destroy($id)
    {
        $role = Role::findOrFail($id);

        if ($role->isSystem()) {
            return response()->json(['message' => 'Built-in roles cannot be deleted — deactivate it instead.'], 422);
        }
        if ($role->userRoles()->exists()) {
            return response()->json(['message' => 'This role is linked to users, so it can only be deactivated.'], 422);
        }

        $label = $role->label;
        $role->delete();
        ActionLog::log(auth()->id(), 'account update', "Deleted the role {$label}");

        return response()->json(['message' => 'Role deleted successfully.', 'roles' => self::list()]);
    }
}
