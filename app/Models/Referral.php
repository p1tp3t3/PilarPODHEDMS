<?php

namespace App\Models;

use App\Models\Concerns\HasDerivedSchoolYearSemester;
use App\Models\Concerns\HasRecordAccess;
use App\Models\Concerns\HasDocumentPdf;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Concerns\LimitsEdits;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOneThrough;
use Illuminate\Support\Facades\File;

class Referral extends Model
{
    use HasFactory, HasDerivedSchoolYearSemester, HasDocumentPdf, HasRecordAccess, LimitsEdits;

    protected function documentFolder(): string
    {
        return "referrals/referral-{$this->referral_number}";
    }

    protected function documentOwnerId(): ?int
    {
        return $this->referrer_id;
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
        'referrer_id',
        'prefect_id',
        'referral_number',
        'reason_description',
        'referral_status',
        'rejected_reason',
        'rejected_at',
        'revoked_at',
        'edited_at',
        'send_to_guidance',
        'sent_to',
        'sent_at',
        'office_note',
        'office_note_by',
        'office_note_at',
        'confirmed_at',
        'archived_at',
    ];

    /** The offices a referral can be sent on to (non_teaching_staff positions). */
    public const OFFICES = ['Guidance', 'IT Staff'];

    /** The office (Guidance / IT Staff) a user works in, or null. */
    public static function officeOf(?User $user): ?string
    {
        if (! $user || $user->role !== 'non_teaching_staff') {
            return null;
        }
        $position = NonTeachingStaff::where('user_id', $user->id)->first()?->position;

        return in_array($position, self::OFFICES, true) ? $position : null;
    }

    /** Whether this referral was sent to the office `$user` works in. */
    public function isSentToOfficeOf(?User $user): bool
    {
        $office = self::officeOf($user);

        // Only referrals actually sent with "Send to" (sent_to). The old
        // send_to_guidance flag was never set by the app (only random test
        // data), so it doesn't count.
        return $office !== null && $this->sent_to === $office;
    }

    /** Only referrals sent to `$office` (for that office's list). */
    public function scopeSentToOffice($query, string $office)
    {
        return $query->where('sent_to', $office);
    }

    public $timestamps = false;

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'referrer_id', 'id');
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

    // Who wrote the office's note (Guidance / IT Staff).
    public function officeNoteBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'office_note_by', 'id');
    }

    /**
     * A referral's form is never saved: it is always built from the record
     * (so it shows the current details and the office's note), even if an
     * older saved file is still in its folder.
     */
    public function documentPdfPath(): ?string
    {
        return null;
    }

    protected function canRenderDocumentPdf(): bool
    {
        return true;
    }

    /** The referral form as the referral stands now (not saved). */
    public function renderDocumentPdf(): ?\Barryvdh\DomPDF\PDF
    {
        $prefect = $this->prefect?->profile
            ?? User::with('profile')->whereRole('sub_admin')->first()?->profile;

        return $this->referralFormPdf(trim("{$prefect?->first_name} {$prefect?->last_name}"));
    }

    /** The referral form PDF (the form's data, laid out). */
    private function referralFormPdf(string $fallbackReferrer = ''): \Barryvdh\DomPDF\PDF
    {
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
                    'course' => trim(($student?->program?->code ?? '').($year ? " - {$year}" : '')) ?: '—',
                ];
            })->values()->all();

        // The referrer is the teacher who filed it (the prefect if they did).
        $this->loadMissing('user.profile');
        $referrer = $this->user?->profile;

        return Pdf::loadView('pdf.referral-guidance', [
            'date_time' => Carbon::parse($this->created_at)->format('F d, Y (h:i A)'),
            'students' => $students,
            'referral_reason' => $this->reason_description,
            'referrer_name' => $referrer ? $fullName($referrer) : $fallbackReferrer,
            // The note the office it was sent to wrote back (plain text on the form).
            'office_note' => $this->office_note ? trim(html_entity_decode(strip_tags(str_replace(['</p>', '<br>', '<br/>', '<br />', '</li>'], PHP_EOL, $this->office_note)))) : null,
            'office_note_by' => $this->office_note_by ? $fullName(User::with('profile')->find($this->office_note_by)?->profile) : null,
            'sent_to' => $this->sent_to,
            // Watermark on a form that isn't final (pdf.partials.status-watermark).
            'status' => $this->revoked_at ? 'revoked' : $this->referral_status,
        ])->setPaper('a4');
    }

    // HasRecordAccess: the referrer and the prefect who filed it, Guidance,
    // and the referred students' parents and program heads.
    protected function involvedUserIds(): array
    {
        return [$this->referrer_id, $this->prefect_id];
    }

    protected function involvedStudentIds(): array
    {
        return $this->referralReferredStudent()->pluck('student_id')->all();
    }

    protected function canViewExtra(User $user): bool
    {
        return $this->canViewPdf($user);
    }

    /**
     * Still pending (not approved, rejected or revoked): its related
     * violations can be set and its students intervened. Once approved, the
     * students are already intervened.
     */
    public function awaitsIntervention(): bool
    {
        return $this->confirmed_at === null && $this->rejected_at === null && $this->revoked_at === null;
    }
}
