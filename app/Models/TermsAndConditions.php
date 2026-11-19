<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The Terms and Conditions a parent/guardian agrees to when registering
 * (guest/parent-registration). The System Admin edits them in System
 * Settings; each save is a new version, the latest one is in effect. Until
 * the first save, the built-in default text below is used.
 */
class TermsAndConditions extends Model
{
    protected $table = 'terms_and_conditions';

    protected $fillable = ['content', 'version', 'updated_by'];

    /** The version of the built-in text (as sent with older registrations). */
    public const DEFAULT_VERSION = '2026-11-08';

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * The terms in effect: the latest saved version, or the built-in text.
     *
     * @return array{content: string, version: string, updated_at: ?string, updated_by: ?string, is_default: bool}
     */
    public static function current(): array
    {
        $latest = self::with('updatedBy.profile')->latest('id')->first();

        if (! $latest) {
            return [
                'content' => self::defaultContent(),
                'version' => self::DEFAULT_VERSION,
                'updated_at' => '2026-11-08',
                'updated_by' => null,
                'is_default' => true,
            ];
        }

        $by = $latest->updatedBy?->profile;

        return [
            'content' => $latest->content,
            'version' => $latest->version,
            'updated_at' => $latest->created_at?->toIso8601String(),
            'updated_by' => $by ? trim("{$by->first_name} {$by->last_name}") : null,
            'is_default' => false,
        ];
    }

    /** The built-in terms (the text the registration form first shipped with). */
    public static function defaultContent(): string
    {
        $sections = [
            '1. Purpose of the Account' => [
                "The parent/guardian account lets you follow your child's discipline records at Pilar College: complaints, violations, sanctions, appointments, absences and gate passes, and receive notices from the Prefect of Discipline.",
                "The account is for monitoring and communication with the school only. It does not replace the school's official channels, meetings or written notices.",
            ],
            '2. Eligibility and Truthful Information' => [
                'Only a parent or legal guardian of a currently enrolled student may register.',
                "You confirm that the details you give, including your name, relationship, contact number, email and your child's details, are true and complete. The school may verify them and may ask for proof of relationship or guardianship.",
                'Your registration is reviewed by the school administrator. It may be approved, denied, or later deactivated if the information turns out to be false or the relationship ends.',
            ],
            '3. Account Security' => [
                'Keep your login details private. Do not share your account or let anyone else use it.',
                'You are responsible for activity done through your account. Tell the school right away if you think someone else has accessed it.',
            ],
            '4. Data Privacy' => [
                "The school collects and processes your personal information and your child's records in line with the Data Privacy Act of 2012 (Republic Act No. 10173) and the school's privacy policy.",
                'Your information is used only to verify your identity and relationship, give you access to your child\'s records, and contact you about school matters.',
                'You may ask the school to correct your information or to deactivate your account. Some records may still be kept as required by school policy or law.',
            ],
            '5. Confidentiality of Records' => [
                'Discipline records are confidential. You may see only the records of the child or children linked to your account.',
                'Do not copy, post, share or forward records, screenshots or information about other students, complainants or witnesses that you may come across.',
            ],
            '6. Proper Use' => [
                'Use the system respectfully and only for its purpose. Do not try to access other accounts or records, disrupt the system, or submit false or harmful content.',
                'Concerns about a decision or a record should be raised with the Prefect of Discipline through the proper school process.',
            ],
            '7. Suspension and Changes' => [
                'The school may suspend or deactivate an account that breaks these terms or school policy.',
                'These terms may be updated. Continued use of the account after an update means you accept the updated terms.',
            ],
        ];

        $html = '';
        foreach ($sections as $title => $paragraphs) {
            $html .= '<h3>'.e($title).'</h3>';
            foreach ($paragraphs as $p) {
                $html .= '<p>'.e($p).'</p>';
            }
        }

        return $html;
    }
}
