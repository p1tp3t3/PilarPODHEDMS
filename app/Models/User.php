<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use NotificationChannels\WebPush\HasPushSubscriptions;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasPushSubscriptions, \Illuminate\Auth\MustVerifyEmail;

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
    ];

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

    public function profile()
    {
        return $this->hasOne(Profile::class, 'user_id', 'id');
    }

    public function permissions()
    {
        return $this->hasOne(UserPermission::class, 'user_id', 'id');
    }

    public function enrollments()
    {
        // Every consumer of this relation (showUserType() on the frontend,
        // and its several inline re-implementations across list components)
        // picks the LAST array element as "the current enrollment" — that's
        // only reliable if the relation itself guarantees insertion order,
        // which a bare hasMany does not.
        return $this->hasMany(Enrollment::class, 'student_id', 'id')->orderBy('id');
    }

    public function enrollment()
    {
        return $this->hasOne(Enrollment::class, 'student_id', 'id')
            ->where('status', 'enrolled')
            ->latestOfMany('id');
    }

    public function program()
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

    public function teachingStaff()
    {
        return $this->hasOne(TeachingStaff::class, 'user_id', 'id');
    }

    public function nonTeachingStaff()
    {
        return $this->hasOne(NonTeachingStaff::class, 'user_id', 'id');
    }

    public function parent()
    {
        return $this->hasOne(Parents::class, 'user_id', 'id');
    }

    public function child()
    {
        return $this->hasMany(FamilyMember::class, 'member_id', 'id');
    }

    public function educationBackground()
    {
        return $this->hasMany(EducationBackground::class, 'student_id', 'id');
    }

    public function actionLog()
    {
        return $this->hasMany(ActionLog::class, 'user_id', 'id');
    }

    public function complainant()
    {
        return $this->hasMany(Complaint::class, 'complainant_id', 'id');
    }

    public function complaintSubject()
    {
        return $this->hasMany(Complaint::class, 'student_id', 'id');
    }

    public function absent()
    {
        return $this->hasMany(Absence::class, 'student_id', 'id');
    }

    public function referral()
    {
        return $this->hasMany(Referral::class, 'teaching_staff_id', 'id');
    }

    public function referralReferred()
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

    public function appointment()
    {
        return $this->hasMany(Appointment::class, 'user_id', 'id');
    }

    public function gatepass()
    {
        return $this->hasMany(GatePass::class, 'user_id', 'id');
    }

    public function notificationSender()
    {
        return $this->hasMany(Notifications::class, 'sender_id', 'id');
    }

    public function notificationReceiver()
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
            'teaching_staff' => ['teachingStaff.program', 'profile', 'permissions'],
            'non_teaching_staff' => ['nonTeachingStaff', 'profile', 'permissions'],
            'parent' => ['parent', 'profile', 'permissions'],
            default => ['profile', 'permissions'],
        };
    }

    public function findAccount(string $username)
    {
        $role = $this->select('role')->where('username', $username)->first()?->role;

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
            ->whereRaw('DATE(created_at) = DATE(NOW())')
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
            $query->where('role', $role);

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
                'data' => \App\Http\Resources\UserResource::collection($data),
            ],
        ];
    }

    public function getAllStudent()
    {
        return $this->where('role', 'student')
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
