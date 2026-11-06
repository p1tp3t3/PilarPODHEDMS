<?php

namespace App\Models;

use App\Models\Concerns\HasDerivedSchoolYearSemester;
use App\Models\Concerns\HasDocumentPdf;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Support\Facades\File;

class Referral extends Model
{
    use HasFactory, HasDerivedSchoolYearSemester, HasDocumentPdf;

    protected function documentFolder(): string
    {
        return "referrals/referral-{$this->referral_number}";
    }

    protected function documentOwnerId(): ?int
    {
        return $this->teaching_staff_id;
    }

    public function documentType(): string
    {
        return 'referral';
    }

    protected $table = 'referral';


    // Always load who filed it on someone's behalf, so every list/table
    // can show "Filed By (Prefect)" without each query having to ask.
    protected $with = ['prefect.profile'];
    protected $fillable = [
        'teaching_staff_id',
        'prefect_id',
        'referral_number',
        'reason_description',
        'referral_status',
        'rejected_reason',
        'rejected_at',
        'revoked_at',
        'edited_at',
        'send_to_guidance',
        'confirmed_at',
        'archived_at',
    ];

    public $timestamps = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teaching_staff_id', 'id');
    }

    public function referredStudent(): HasOneThrough
    {
        return $this->hasOneThrough(
            User::class,
            ReferralReferredStudent::class,
            'referral_id', // FK on referral_referred_student
            'id',          // FK on users
            'id',          // local key on referral
            'student_id'   // local key on referral_referred_student
        );
    }

    public function referralReferredStudent(): HasMany
    {
        return $this->hasMany(ReferralReferredStudent::class, 'referral_id', 'id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(ReferralRevision::class, 'referral_id', 'id')->latest('created_at');
    }

    // The prefect who filed this referral on the referrer's behalf (null
    // when the referrer filed it, or the prefect is the referrer).
    public function prefect(): BelongsTo
    {
        return $this->belongsTo(User::class, 'prefect_id', 'id');
    }

    /**
     * Render this referral's Referral Form (POD.COL-FO 0015) into its folder:
     * one form listing every referred student, since a teacher can refer
     * several students in one referral. Rebuilt every time so an edited
     * referral never ships a stale form; the old one-PDF-per-student files
     * are removed so the folder only holds the current form.
     *
     * @param  string  $fallbackReferrer  name shown when the referrer has no profile
     * @return string full path of the form
     */
    public function saveReferralForm(string $fallbackReferrer = ''): string
    {
        $folder = storage_path("app/private/referrals/referral-{$this->referral_number}");
        File::ensureDirectoryExists($folder);
        File::delete(File::glob("{$folder}/referral-student-*.pdf"));

        $fullName = fn ($p) => trim(preg_replace('/\s+/', ' ', "{$p?->first_name} {$p?->middle_name} {$p?->last_name}"));

        $students = $this->referralReferredStudent()
            ->with(['user.profile', 'user.program', 'user.enrollments'])
            ->get()
            ->map(function ($item) use ($fullName) {
                $student = $item->user;
                $enrollment = $student?->enrollments?->sortByDesc('id')->first();
                $year = match ((int) ($enrollment?->year_level ?? 0)) {
                    1 => '1st Year', 2 => '2nd Year', 3 => '3rd Year', 0 => '',
                    default => "{$enrollment->year_level}th Year",
                };

                return [
                    'name' => $fullName($student?->profile),
                    'course' => trim(($student?->program?->name ?? '').($year ? " - {$year}" : '')) ?: '—',
                ];
            })->values()->all();

        // The referrer is the teacher who filed it (the prefect if they did).
        $this->loadMissing('user.profile');
        $referrer = $this->user?->profile;

        $filePath = "{$folder}/referral-form-{$this->referral_number}.pdf";
        Pdf::loadView('pdf.referral-guidance', [
            'date_time' => Carbon::parse($this->created_at)->format('F d, Y (h:i A)'),
            'students' => $students,
            'referral_reason' => $this->reason_description,
            'referrer_name' => $referrer ? $fullName($referrer) : $fallbackReferrer,
        ])->setPaper('a4')->save($filePath);

        return $filePath;
    }
}
