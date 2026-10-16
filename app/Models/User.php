<?php

namespace App\Models;

use App\Http\Resources\UserResource;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, \Illuminate\Auth\MustVerifyEmail, Notifiable;

    public $timestamps = true;

    const UPDATED_AT = null;

    protected $table = 'users';

    protected $fillable = [
        'id_number',
        'role',
        'username',
        'email',
        'already_update_profile',
        'already_update_password',
        'password',
        'activate',
        'last_seen',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'currentUserRole',
    ];

    protected $appends = ['encrypted_id', 'role'];

    protected $with = ['currentUserRole.role'];

    public function getEncryptedIdAttribute(): string
    {
        return encrypt_id($this->id);
    }

    // ---- Roles -----------------------------------------------------------
    // A user's role lives in user_roles (one row per assignment, oldest is
    // the registered one with is_original_role). The current role is the
    // newest row; `$user->role` returns its name so existing role checks
    // keep working unchanged.

    protected ?string $pendingRole = null;

    // Done in save() rather than a `saved` model event so it still runs
    // when model events are muted (e.g. DatabaseSeeder's WithoutModelEvents).
    public function save(array $options = [])
    {
        $saved = parent::save($options);

        if ($saved && $this->pendingRole !== null) {
            $role = $this->pendingRole;
            $this->pendingRole = null;
            $this->assignRole($role);
        }

        return $saved;
    }

    /** Every ID number this user has had; the current one has ended_at null. */
    public function idNumbers(): HasMany
    {
        return $this->hasMany(UserIdNumber::class)->with('role:id,name,label')->orderBy('started_at')->orderBy('id');
    }

    public function userRoles(): HasMany
    {
        return $this->hasMany(UserRole::class, 'user_id')->orderBy('id');
    }

    public function currentUserRole(): HasOne
    {
        return $this->hasOne(UserRole::class, 'user_id')->latestOfMany('id');
    }

    public function getRoleAttribute(): ?string
    {
        return $this->currentUserRole?->role?->name;
    }

    // Lets User::create(['role' => ...]) / $user->role = ... keep working:
    // the role row is written once the user itself has been saved.
    public function setRoleAttribute(?string $role): void
    {
        if ($this->exists) {
            $this->assignRole($role);
        } else {
            $this->pendingRole = $role;
        }
    }

    /**
     * Makes $role the user's current role by adding a user_roles row. The
     * first row a user ever gets is marked as their original role. A no-op
     * when the user already has that role.
     */
    public function assignRole(string $role): UserRole
    {
        $current = $this->currentUserRole()->first();
        if ($current && $current->role_id === Role::idFor($role)) {
            return $current;
        }

        // A brand-new account: its starting ID number goes on record.
        if (! $current) {
            UserIdNumber::ensureCurrent($this, $role);
        }

        $userRole = UserRole::create([
            'user_id' => $this->id,
            'role_id' => Role::idFor($role),
            'is_original_role' => ! $current && ! $this->userRoles()->exists(),
        ]);

        $this->setRelation('currentUserRole', $userRole->load('role'));

        return $userRole;
    }

    /**
     * Filters by current role — replaces the old where('role', ...) /
     * whereIn('role', [...]) on the dropped users.role column.
     */
    public function scopeWhereRole($query, string|array $roles, string $boolean = 'and', bool $not = false)
    {
        $roles = (array) $roles;
        $sub = fn ($s) => $s->select('ur.user_id')
            ->from('user_roles as ur')
            ->join('roles as r', 'r.id', '=', 'ur.role_id')
            ->whereRaw('ur.id = (select max(ur2.id) from user_roles as ur2 where ur2.user_id = ur.user_id)')
            ->whereIn('r.name', $roles);

        $column = $query->qualifyColumn('id');

        return $not
            ? $query->whereNotIn($column, $sub, $boolean)
            : $query->whereIn($column, $sub, $boolean);
    }

    /**
     * Students whose most recent enrollment is "enrolled" — i.e. not
     * dropped since. (Not tied to the active semester: enrollment records
     * are only added on import, so they may lag the school-year calendar.)
     */
    public function scopeCurrentlyEnrolled($query)
    {
        return $query->whereIn($query->qualifyColumn('id'), fn ($s) => $s
            ->select('e.student_id')
            ->from('enrollment as e')
            ->whereRaw('e.id = (select max(e2.id) from enrollment as e2 where e2.student_id = e.student_id)')
            ->where('e.status', 'enrolled'));
    }

    public function scopeOrWhereRole($query, string|array $roles)
    {
        return $this->scopeWhereRole($query, $roles, 'or');
    }

    public function scopeWhereRoleNot($query, string|array $roles)
    {
        return $this->scopeWhereRole($query, $roles, 'and', true);
    }

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function profile(): HasOne
    {
        return $this->hasOne(Profile::class, 'user_id', 'id');
    }

    public function permissions(): HasOne
    {
        return $this->hasOne(UserPermission::class, 'user_id', 'id');
    }

    public function enrollments(): HasMany
    {
        // Every consumer of this relation (showUserType() on the frontend,
        // and its several inline re-implementations across list components)
        // picks the LAST array element as "the current enrollment" — that's
        // only reliable if the relation itself guarantees insertion order,
        // which a bare hasMany does not.
        return $this->hasMany(Enrollment::class, 'student_id', 'id')->orderBy('id');
    }

    public function enrollment(): HasOne
    {
        return $this->hasOne(Enrollment::class, 'student_id', 'id')
            ->where('status', 'enrolled')
            ->latestOfMany('id');
    }

    public function program(): HasOneThrough
    {
        return $this->hasOneThrough(
            Program::class,
            Enrollment::class,
            'student_id', // FK on enrollment referencing this user
            'id',         // FK on program referenced by enrollment.program_id
            'id',         // local key on users
            'program_id'  // local key on enrollment
        )->where('enrollment.status', 'enrolled')->latestOfMany('id');
    }

    public function teachingStaff(): HasOne
    {
        return $this->hasOne(TeachingStaff::class, 'user_id', 'id');
    }

    public function nonTeachingStaff(): HasOne
    {
        return $this->hasOne(NonTeachingStaff::class, 'user_id', 'id');
    }

    public function parent(): HasOne
    {
        return $this->hasOne(Parents::class, 'user_id', 'id');
    }

    public function child(): HasMany
    {
        return $this->hasMany(FamilyMember::class, 'member_id', 'id');
    }

    public function educationBackground(): HasMany
    {
        return $this->hasMany(EducationBackground::class, 'student_id', 'id');
    }

    public function actionLog(): HasMany
    {
        return $this->hasMany(ActionLog::class, 'user_id', 'id');
    }

    public function complainant(): HasMany
    {
        return $this->hasMany(Complaint::class, 'complainant_id', 'id');
    }

    public function complaintSubject(): HasMany
    {
        return $this->hasMany(Complaint::class, 'student_id', 'id');
    }

    public function absent(): HasMany
    {
        return $this->hasMany(Absence::class, 'student_id', 'id');
    }

    public function referral(): HasMany
    {
        return $this->hasMany(Referral::class, 'teaching_staff_id', 'id');
    }

    public function referralReferred(): HasManyThrough
    {
        return $this->hasManyThrough(
            Referral::class,
            ReferralReferredStudent::class,
            'student_id', // FK on referral_referred_student referencing this user
            'id',         // FK on referral
            'id',         // local key on users
            'referral_id' // local key on referral_referred_student
        );
    }

    public function appointment(): HasMany
    {
        return $this->hasMany(Appointment::class, 'user_id', 'id');
    }

    public function gatepass(): HasMany
    {
        return $this->hasMany(GatePass::class, 'user_id', 'id');
    }

    public function notificationSender(): HasMany
    {
        return $this->hasMany(Notifications::class, 'sender_id', 'id');
    }

    public function notificationReceiver(): HasMany
    {
        return $this->hasMany(Notifications::class, 'receiver_id', 'id');
    }

    /**
     * Relations to eager-load per role, for account lookups.
     */
    private function relationsForRole(string $role): array
    {
        return match ($role) {
            'student' => ['program', 'enrollments.program', 'enrollments.schoolYear', 'educationBackground', 'profile', 'permissions'],
            'teaching_staff' => ['teachingStaff.program', 'teachingStaff.programsHandled', 'profile', 'permissions'],
            'non_teaching_staff' => ['nonTeachingStaff', 'profile', 'permissions'],
            'parent' => ['parent', 'profile', 'permissions'],
            default => ['profile', 'permissions'],
        };
    }

    public function findAccount(string $username)
    {
        $role = $this->where('username', $username)->first()?->role;

        return $this->with($this->relationsForRole($role))
            ->where('username', $username)
            ->first();
    }

    public function findAccountContactDetail(string $username)
    {
        return $this->select('email')
            ->where('username', $username)
            ->first();
    }

    public function newUsers()
    {
        return $this->with(['profile', 'program', 'enrollments.program', 'enrollments.schoolYear', 'teachingStaff.program', 'parent'])
            ->where('id', '!=', auth()->id())
            // This week (Mon–Sun), same week the prefect's "New Students" uses.
            ->whereBetween('created_at', [now()->startOfWeek(), now()->endOfWeek()])
            ->latest()
            ->get();
    }

    public function active(int $limit)
    {
        return $this->where('id', '!=', auth()->id())
            ->where('activate', true)
            ->limit($limit)
            ->get();
    }

    public function allUserAccount()
    {
        $query = $this->with(['profile', 'program', 'enrollments', 'teachingStaff.program', 'nonTeachingStaff'])->where('id', '!=', auth()->id());

        $role = request()->query('role', request()->query('user-type'));
        $program = request()->query('program');

        if ($role && $role !== 'all') {
            $query->whereRole($role);

            if ($role === 'student') {
                $query->select('users.*');

                if ($program && $program !== 'all') {
                    $query->join('enrollment as e', 'e.student_id', '=', 'users.id')
                        ->where('e.program_id', $program);
                }
            }

            if ($role === 'teaching_staff') {
                $query->join('teaching_staff as t', 't.user_id', '=', 'users.id')
                    ->select('users.*');

                if ($program && $program !== 'all') {
                    $query->where('t.program_id', $program);
                }
            }
        }

        $data = $query->latest('users.created_at')->get();

        return [
            'user' => auth()->user(),
            'account_list' => [
                'data' => UserResource::collection($data),
            ],
        ];
    }

    public function getAllStudent()
    {
        return $this->whereRole('student')
            ->latest('created_at')
            ->get();
    }

    public function getContact(string $username)
    {
        return $this->select('email')
            ->where('username', $username)
            ->first();
    }

    public function searchAccount(string $search, int $limit = 10)
    {
        return $this->where('id', '!=', auth()->id())
            ->where('id_number', 'like', "%$search%")
            ->orWhere('username', 'like', "%$search%")
            ->latest('created_at')
            ->paginate($limit)
            ->appends(['search' => $search]);
    }
}
