<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Modules\AbsentForm\AbsentFormController;
use App\Http\Controllers\Modules\Account\RegisteredUserController;
use App\Http\Controllers\Modules\Complaint\ComplaintController;
use App\Http\Controllers\Modules\GatePass\GatePassController;
use App\Http\Controllers\Modules\Referral\ReferralController;
use App\Http\Controllers\Modules\Violation\ViolationController;
use App\Models\ActionLog;
use App\Models\ComplaintSubject;
use App\Models\EducationBackground;
use App\Models\Enrollment;
use App\Models\Faculty;
use App\Models\Family;
use App\Models\Profile;
use App\Models\Program;
use App\Models\SchoolYear;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ProfileController extends Controller
{
    protected $apiKey = [
        'pexels' => 'tXInTzEb1j3w0U1sEosQn6vWS7wfFmW53IihHaZ2jL2GkNYpKDKRZqKf',
    ];

    private $src;

    private $id;

    // Lets search results link to a profile by id instead of exposing
    // username (treated as sensitive) in search API responses.
    public function redirectById($id)
    {
        $username = User::where('id', $id)->value('username');

        if (! $username) {
            abort(404, 'User not found.');
        }

        return redirect("/profile/{$username}");
    }

    public function index($id)
    {
        $account = new User;

        $account = $account->findAccount($id);

        if (! $account) {
            abort(404, 'User not found.');
        }

        $props = [
            // teachingStaff loaded so the frontend can tell a program head
            // apart from regular faculty (position === 'program_head'),
            // used to gate seeing a student's enrollment history below.
            'user' => User::with('teachingStaff')->find(auth()->id()),
            'otherUserProfile' => $account,
            'studentPrograms' => User::with('program')->where('id', auth()->user()->id)->first(),
            'school_years' => SchoolYear::orderByDesc('year')->get(['id', 'year']),
        ];
        $family = $account->role == 'student' || $account->role == 'parent';

        if ($family) {
            $userId = $account->id;
            $parentStudent = new RegisteredUserController;

            $props = array_merge($props, [
                'family' => self::getFamilyBackground($userId),
                'education_background' => EducationBackground::where('student_id', $userId)
                    ->get()
                    ->toArray(),
            ], $parentStudent->getParentAndStudent());
        }

        // Incidents/violations are restricted to the prefect, the student's
        // program head, and the student's parent — matching the tab's own
        // gating in profile.jsx. Not computed for anyone else (not just
        // hidden in the UI), so the data never ships in the page payload
        // for a viewer who shouldn't see it in the first place.
        $canViewIncidents = in_array(auth()->user()->role, ['sub_admin', 'parent']) || (bool) is_program_head();

        if ($account->role == 'student' && $canViewIncidents) {
            $props = array_merge($props, [
                'incident_groups' => self::getStudentIncidentGroups($account->id),
                'violation_occurrences' => (new ViolationController)->getStudentViolationOccurence($account->id),
            ]);
        }

        // Any role can file a complaint, so "Complaints Filed" is a tab on
        // every profile — but complaint content is private from super_admin
        // (data privacy), reviewable only by the sub_admin (prefect) who
        // actually handles them or by the person themselves. Referrals/
        // absent forms/gate passes are each only filed by one specific
        // role, so those tabs stay scoped to that role's own profile and
        // remain visible to super_admin as before.
        $canViewOwnFilings = in_array(auth()->user()->role, ['super_admin', 'sub_admin']) || auth()->id() === $account->id;
        $canViewOwnComplaints = auth()->user()->role === 'sub_admin' || auth()->id() === $account->id;

        if ($canViewOwnComplaints) {
            $props['complaints_filed'] = (new ComplaintController)->getComplainantComplaint($account->id);
        }

        if ($canViewOwnFilings) {
            if ($account->role === 'teaching_staff') {
                $props['referrals_filed'] = (new ReferralController)->getReferrerReferral($account->id);
            }

            if ($account->role === 'student') {
                $props['absent_forms_filed'] = (new AbsentFormController)->getStudentAbsentForms($account->id);
                $props['gatepass_requested'] = (new GatePassController)->getUserGatePassRequests($account->id);
            }
        }

        return Inertia::render('other/profile', $props);
    }

    /**
     * Powers the "Recent Incidents" sub-tab on the student profile
     * (resources/js/Components/list/incident-group-list.jsx), grouping the
     * student's resolved complaints by incident type. Previously fetched
     * client-side from /api/student/incident/{id}, a route that doesn't
     * exist.
     */
    public function getStudentIncidentGroups($id)
    {
        $subjects = ComplaintSubject::with(['complaint.violation', 'offenses'])
            ->where('student_id', $id)
            ->whereHas('complaint', fn ($q) => $q->where('complaint_status', 'resolved'))
            ->get();

        return $subjects->groupBy(fn ($cs) => $cs->complaint->incident_id)
            ->map(function ($group) {
                $first = $group->first();

                return [
                    'violation_id' => $first->complaint->incident_id,
                    'violation_name' => $first->complaint->violation->violation_name ?? 'Unknown',
                    'incidents' => $group->map(fn ($cs) => [
                        // complaint_subject/complaint_subject_violation are
                        // composite-key junction tables with no id column;
                        // complaint_id is unique per student within a group.
                        'complaint_subject_id' => $cs->complaint_id,
                        'case_number' => $cs->complaint->case_number,
                        'created_at' => $cs->complaint->created_at,
                        'incident' => $cs->complaint->violation->violation_name ?? null,
                        'resolved_since' => $cs->complaint->resolved_at,
                        'summary' => $cs->complaint->incident_summary ?? $cs->incident_summary,
                        'offenses' => $cs->offenses->map(fn ($o) => ['id' => $o->violation_id])->values(),
                    ])->values(),
                ];
            })
            ->values();
    }

    public function edit($id)
    {
        $account = new User;

        $account = $account->findAccount($id);

        if (! $account) {
            abort(404, 'User not found.');
        }

        $userId = $account->id;

        $props = [
            'user' => auth()->user(),
            'otherUserProfile' => $account,
            'program' => Program::latest('created_at')->get(['id', 'description']),
            'education_background' => EducationBackground::where('student_id', $userId)
                ->get()
                ->toArray(),
        ];

        return Inertia::render('student/edit-profile-form', $props);
    }

    /**
     * Update the user's profile information.
     */
    public function update(Request $request, $username)
    {
        // Resolve the target account from the route, never from a client-supplied
        // id in the request body — trusting a posted id let anyone edit anyone
        // else's profile just by changing a form field.
        $targetUser = User::where('username', $username)->first();

        if (! $targetUser) {
            abort(404, 'User not found.');
        }

        $isSelf = $targetUser->id === auth()->id();
        if (! $isSelf && ! in_array(auth()->user()->role, ['super_admin', 'sub_admin'])) {
            abort(403);
        }

        // During forced first-login setup, profile and password are saved
        // together by AccountSetupController::complete() — this endpoint
        // must not persist a profile on its own until that combined step
        // happens, even if hit directly.
        if ($isSelf && session('force_account_setup')) {
            return response()->json([
                'message' => 'Complete account setup (profile and password together) before editing your profile.',
            ], 422);
        }

        $diffFields = ['religion', 'citizenship', 'civil_status', 'date_of_birth', 'place_of_birth', 'current_address', 'permanent_address', 'sex', 'contact_number'];
        $oldProfile = Arr::only($targetUser->profile?->toArray() ?? [], $diffFields);
        $oldEmail = $targetUser->email;

        self::applyProfileFields($targetUser, $request);

        $userFields = [];
        if ($request->filled('email')) {
            $userFields['email'] = strtolower($request->email);
        }
        if ($isSelf && ! $targetUser->already_update_profile) {
            $userFields['already_update_profile'] = true;
        }
        if (! empty($userFields)) {
            $targetUser->update($userFields);
        }

        // Log action — a field-level before/after diff instead of just a
        // sentence, so a viewer can see exactly what changed.
        $newProfile = Arr::only(Profile::where('user_id', $targetUser->id)->first()?->toArray() ?? [], $diffFields);
        $changes = [];
        foreach ($diffFields as $field) {
            $from = $oldProfile[$field] ?? null;
            $to = $newProfile[$field] ?? null;
            if ((string) $from !== (string) $to) {
                $changes[$field] = ['from' => $from ?? '—', 'to' => $to ?? '—'];
            }
        }
        if (isset($userFields['email']) && $oldEmail !== $userFields['email']) {
            $changes['email'] = ['from' => $oldEmail, 'to' => $userFields['email']];
        }

        ActionLog::log(
            auth()->id(),
            'profile update',
            $isSelf ? 'Updated its user profile information' : "Updated {$targetUser->username}'s profile information",
            $changes
        );

        return response()->json(['message' => 'successfully']);

    }

    /**
     * Write the profiles-table fields (and picture / education background)
     * for $targetUser from $request. Shared by the normal profile-edit
     * endpoint and AccountSetupController::complete(), which needs the same
     * writes as part of its combined profile+password submission.
     */
    public function applyProfileFields(User $targetUser, Request $request): void
    {
        // getUserFields() returns profiles-table columns — write them to the
        // Profile model, not User (User has no religion/address/etc. columns,
        // so this used to silently drop every one of these fields).
        $account = self::getUserFields($request);

        $oldPicture = $targetUser->profile?->profile_picture;

        // If new picture uploaded → new filename
        if ($request->hasFile('profile_picture')) {
            $newFileName = time().'_'.$request->file('profile_picture')->getClientOriginalName();
            $account['profile_picture'] = $newFileName;
        } else {
            // No new upload → keep old filename
            $newFileName = $oldPicture;
            $account['profile_picture'] = $oldPicture;
        }

        // profiles has no auto-increment primary key (keyed by user_id alone),
        // so update via the query builder rather than a model instance.
        Profile::where('user_id', $targetUser->id)->update($account);

        // Save new file / replace old
        if ($request->hasFile('profile_picture')) {

            // Delete old file if exists
            if ($oldPicture) {
                Storage::disk('public')->delete("profile-pictures/{$oldPicture}");
            }

            // Save new picture
            Storage::disk('public')->putFileAs('profile-pictures', $request->file('profile_picture'), $newFileName);
        }

        // Student specific update
        if ($targetUser->role == 'student') {
            self::updateEducationBackground($request);
        }
    }

    public function updateIdInFile($newId, $user)
    {
        try {
            $oldId = $user->user_id;
            $userType = $user->user_type;

            // Do nothing if the ID didn't change
            if ($oldId === $newId) {
                return;
            }

            $programId = null;
            $yearLevel = null;

            if ($userType === 'student') {
                $enrollment = Enrollment::where('student_id', $newId)->where('status', 'enrolled')->latest('id')->first();
                if (! $enrollment) {
                    return;
                }
                $programId = $enrollment->program_id;
                $yearLevel = $enrollment->year_level;

                $programName = Program::where('id', $programId)->value('name') ?? 'unknown';
                $zipPath = storage_path("app/private/zips/student-{$programId}-{$programName}.zip");
                $csvName = "student-account-{$programId}-{$programName}-year-{$yearLevel}.csv";

                if (! file_exists($zipPath)) {
                    Log::warning("Student ZIP not found: $zipPath");

                    return;
                }

                $extractDir = storage_path('app/tmp_zip_edit');
                if (File::exists($extractDir)) {
                    File::deleteDirectory($extractDir);
                }
                File::makeDirectory($extractDir, 0777, true, true);

                $zip = new \ZipArchive;
                if ($zip->open($zipPath) === true) {
                    $zip->extractTo($extractDir);
                    $zip->close();

                    $csvPath = "{$extractDir}/{$csvName}";
                    if (file_exists($csvPath)) {
                        $rows = array_map('str_getcsv', file($csvPath));
                        $updatedRows = [];

                        foreach ($rows as $row) {
                            if (isset($row[0]) && strtolower($row[0]) === strtolower($oldId)) {
                                $row[0] = $newId; // update ID column
                            }
                            $updatedRows[] = $row;
                        }

                        // Write back updated CSV
                        $fp = fopen($csvPath, 'w');
                        foreach ($updatedRows as $row) {
                            fputcsv($fp, $row);
                        }
                        fclose($fp);

                        // Repack into ZIP
                        $zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
                        $zip->addFile($csvPath, $csvName);
                        $zip->close();
                    }

                    File::deleteDirectory($extractDir);
                }
            } elseif ($userType === 'faculty') {
                $faculty = Faculty::where('user_id', $newId)->first();
                if (! $faculty) {
                    return;
                }
                $programId = $faculty->program_id;
                $programName = Str::slug(
                    Program::where('id', $programId)->value('name') ?? 'unknown',
                    '-'
                );
                $csvPath = storage_path("app/private/zips/faculty-account-{$programId}-{$programName}.csv");

                if (! file_exists($csvPath)) {
                    Log::warning("Faculty CSV not found: $csvPath");

                    return;
                }

                $rows = array_map('str_getcsv', file($csvPath));
                $updatedRows = [];

                foreach ($rows as $row) {
                    if (isset($row[0]) && strtolower($row[0]) === strtolower($oldId)) {
                        $row[0] = $newId;
                    }
                    $updatedRows[] = $row;
                }

                $fp = fopen($csvPath, 'w');
                foreach ($updatedRows as $row) {
                    fputcsv($fp, $row);
                }
                fclose($fp);
            } elseif ($userType === 'staff') {
                $csvPath = storage_path('app/private/zips/staff-account.csv');
                if (! file_exists($csvPath)) {
                    Log::warning("Staff CSV not found: $csvPath");

                    return;
                }

                $rows = array_map('str_getcsv', file($csvPath));
                $updatedRows = [];

                foreach ($rows as $row) {
                    if (isset($row[0]) && strtolower($row[0]) === strtolower($oldId)) {
                        $row[0] = $newId;
                    }
                    $updatedRows[] = $row;
                }

                $fp = fopen($csvPath, 'w');
                foreach ($updatedRows as $row) {
                    fputcsv($fp, $row);
                }
                fclose($fp);
            } else {
                User::where('user_id', $user->user_id)->update([
                    'user_id' => $newId,
                ]);
            }

        } catch (\Throwable $e) {
            Log::error("Failed to update ID in CSV/ZIP for {$user->user_id}: ".$e->getMessage());
        }
    }

    public function getPicture($query)
    {
        $response = Http::withHeaders([
            'Authorization' => $this->apiKey['pexels'],
        ])->get('https://api.pexels.com/v1/search', [
            'query' => $query,
            'per_page' => 15,
            'page' => 1,
        ]);

        return $response->json();
    }

    public function generatePicture($username, $userFolder, $photo, $seed = true)
    {
        $rand = ($seed) ? random_int(0, count($photo['photos']) - 1) : 0;
        $src = ($seed) ? $photo['photos'][$rand]['src']['original'] : $photo;

        self::createUserDirectory($userFolder);
        self::createPicture($src, "$username/profile-$username.jpg");
    }

    public function createUserDirectory($folder)
    {
        File::makeDirectory($folder, 0755, true);
        File::makeDirectory("$folder/complaints", 0755, true);
    }

    public function createPicture($src, $fileName)
    {
        $imgContent = file_get_contents($src);

        $image = imagecreatefromstring($imgContent);

        $resizedImage = imagescale($image, 600, 600);

        $filePath = storage_path("app/private/user-assets/$fileName");
        imagejpeg($resizedImage, $filePath);

        imagedestroy($image);
        imagedestroy($resizedImage);
    }

    public function updateEducationBackground(Request $request)
    {
        $educationBackground = $request->data;
        $programId = self::isKeyUndefined($educationBackground, 'college_program');
        $program = Program::where('id', $programId)->value('description');

        if (auth()->user()->role != 'student') {
            $latestEnrollment = Enrollment::where('student_id', $educationBackground['student_id'])
                ->latest('id')
                ->first();
            if ($latestEnrollment) {
                $latestEnrollment->update(['program_id' => $programId]);
            }
        }
        EducationBackground::where('education_type', 'senior_high_school')
            ->where('student_id', $educationBackground['student_id'])
            ->update([
                'school_name' => self::isKeyUndefined($educationBackground, 'sh_school_name'),
                'school_address' => self::isKeyUndefined($educationBackground, 'sh_school_address'),
                'year_graduated' => self::isKeyUndefined($educationBackground, 'sh_year_graduated'),
            ]);
        EducationBackground::where('education_type', 'college')
            ->where('student_id', $educationBackground['student_id'])
            ->where('transferee', 0)
            ->update([
                'school_name' => self::isKeyUndefined($educationBackground, 'college_school_name'),
                'school_address' => self::isKeyUndefined($educationBackground, 'college_school_address'),
                'year_graduated' => self::isKeyUndefined($educationBackground, 'college_year_graduated'),
                'program' => $program,
            ]);
        EducationBackground::where('education_type', 'college')
            ->where('student_id', $educationBackground['student_id'])
            ->where('transferee', 1)
            ->update([
                'school_name' => self::isKeyUndefined($educationBackground, 'tr_college_school_name'),
                'school_address' => self::isKeyUndefined($educationBackground, 'tr_college_school_address'),
                'year_graduated' => self::isKeyUndefined($educationBackground, 'tr_college_year_graduated'),
                'program' => self::isKeyUndefined($educationBackground, 'tr_college_program'),
                'date_attended' => self::isKeyUndefined($educationBackground, 'date_last_attended'),
                'transferee' => 1,
                'year_level' => self::isKeyUndefined($educationBackground, 'year_level'),
            ]);
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    public function getFamilyBackground($id)
    {
        self::setId($id);
        $family = Family::whereHas('familyMember', function ($q) {
            $q->where('member_id', self::getId());
        })
            ->with(['familyMember.member' => function ($q) {
                $q->with(['profile', 'parent', 'program']);
            }])
            ->first();

        $members = [
            'parent' => [],
            'child' => [],
        ];

        $seenParents = [];
        $seenChildren = [];

        if ($family) {
            foreach ($family->familyMember as $familyMember) {
                $member = $familyMember->member;
                if (! $member) {
                    continue;
                }

                if ($member->role === 'parent' && ! in_array($member->id, $seenParents)) {
                    $seenParents[] = $member->id;
                    $members['parent'][] = $member;
                }
                if ($member->role === 'student' && ! in_array($member->id, $seenChildren)) {
                    $seenChildren[] = $member->id;
                    $members['child'][] = $member;
                }
            }
        }

        return [
            'family_code' => ! is_null($family) ? $family->family_code : null,
            'members' => $members,
        ];

    }

    public function getUserFields($request)
    {
        $currentAddress = "{$request->current_place},{$request->current_city},{$request->current_province},{$request->current_zipcode}";
        $permanentAddress = "{$request->permanent_place},{$request->permanent_city},{$request->permanent_province},{$request->permanent_zipcode}";

        return [
            'religion' => ucwords($request->religion ?? ''),
            'citizenship' => ucwords($request->citizenship ?? ''),
            'civil_status' => $request->civil_status,
            'date_of_birth' => (empty($request->date_of_birth)) ? null : $request->date_of_birth,
            'place_of_birth' => ucwords($request->place_of_birth ?? ''),
            'current_address' => $currentAddress,
            'permanent_address' => $permanentAddress,
            'sex' => $request->sex,
            'contact_number' => $request->phone_number,
        ];
    }

    public function setSrc($s)
    {
        $this->src = $s;
    }

    public function setId($s)
    {
        $this->id = $s;
    }

    public function getSrc()
    {
        $rand = random_int(0, count($this->src['photos']) - 1);

        return $this->src['photos'][$rand]['src']['original'];
    }

    public function getId()
    {
        return $this->id;
    }

    private function isKeyUndefined($arr, $key)
    {
        return array_key_exists($key, $arr) ? $arr[$key] : null;
    }
}
