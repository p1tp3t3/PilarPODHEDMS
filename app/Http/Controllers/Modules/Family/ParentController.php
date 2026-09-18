<?php

namespace App\Http\Controllers\Modules\Family;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Modules\Account\RegisteredUserController;
use App\Mail\ParentAccountMail;
use App\Mail\ParentRejectMail;
use App\Mail\SignedLinkMail;
use App\Models\Family;
use App\Models\FamilyMember;
use App\Models\ParentRegistrationRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ParentController extends Controller
{
    public function index()
    {
        $parentRequests = ParentRegistrationRequest::latest('created_at')->get();

        return Inertia::render('itrc/parent-approval-request', [
            'user' => auth()->user(),
            'parent_requests' => $parentRequests,
        ]);
    }

    public function store(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string',
                'email' => 'required|email',
            ]);

            // The submission isn't written to the DB yet — it's held in
            // cache behind a random token until the emailed link is
            // clicked and its signature verified, mirroring the same
            // "hold pending data until confirmed" pattern used for
            // password reset's authorization flag.
            $token = Str::random(64);
            cache()->put("parent_registration_pending_{$token}", [
                'name' => $request->name,
                'email' => $request->email,
                'reason' => $request->reason,
                'parent_details' => $request->parent_details,
            ], now()->addMinutes(60));

            $url = URL::temporarySignedRoute(
                'parent-register.confirm',
                now()->addMinutes(60),
                ['token' => $token]
            );

            Mail::to($request->email)->send(new SignedLinkMail(
                'Confirm Your Registration Request',
                'Confirm Your Parent Registration',
                'Please confirm your registration request by clicking the button below. Once confirmed, it will be sent to the admin for approval.',
                $url,
                'Confirm Registration'
            ));

            return response()->json(['message' => 'success']);
        } catch (Exception $x) {
            return response()->json(['message' => 'error'], 500);
        }
    }

    // Only writes the ParentRegistrationRequest row once the emailed link
    // is actually clicked and its signature verified — store() only ever
    // holds the submission in cache.
    public function confirm(Request $request, $token)
    {
        $key = "parent_registration_pending_{$token}";
        $data = $request->hasValidSignature() ? cache($key) : null;

        if (! $data) {
            return Inertia::render('other/parent-register-confirm', [
                'success' => false,
                'message' => 'This confirmation link is invalid or has expired.',
            ]);
        }

        ParentRegistrationRequest::insert([
            'name' => $data['name'],
            'email' => $data['email'],
            'reason' => $data['reason'],
            'parent_details' => json_encode($data['parent_details']),
        ]);
        cache()->forget($key);

        return Inertia::render('other/parent-register-confirm', [
            'success' => true,
            'message' => 'Your registration request has been submitted and is awaiting admin approval.',
        ]);
    }

    public function storeFamily(Request $request)
    {
        DB::beginTransaction();
        try {
            // generate parent account
            $parent = self::generateParentAccount($request);
            // create family with family members
            $family = Family::insertGetId([
                'family_name' => $request->family_group_name,
            ]);
            FamilyMember::insert([
                'family_id' => $family,
                'member_id' => $parent['id'],
            ]);
            foreach ($request->children as $c) {
                FamilyMember::insert([
                    'family_id' => $family,
                    'member_id' => $c,
                ]);
            }
            // email the account to the parent
            Mail::to($request->email)
                ->send(new ParentAccountMail([[
                    'name' => $parent['name'],
                    'user_id' => $parent['id'],
                    'username' => $parent['username'],
                    'password' => $parent['password'],
                ]]));
            DB::commit();
        } catch (Exception $x) {
            DB::rollBack();
        }
    }

    public function joinFamily(Request $request)
    {
        DB::beginTransaction();
        try {
            $parent = self::generateParentAccount($request);
            $familyId = $request->family_id;
            $user = User::where('user_id', $parent['id'])->first();

            if (FamilyMember::where('member_id', $user->user_id)->exists()) {
                DB::rollBack();

                return response()->json(['message' => 'User already belongs to a family'], 400);
            }

            if ($user->user_type === 'parent') {
                FamilyMember::create([
                    'family_id' => $familyId,
                    'member_id' => $user->user_id,
                ]);
            }
            Mail::to($request->email)
                ->send(new ParentAccountMail([[
                    'name' => $parent['name'],
                    'user_id' => $parent['id'],
                    'username' => $parent['username'],
                    'password' => $parent['password'],
                ]]));
            DB::commit();
        } catch (Exception $x) {
            DB::rollBack();
        }
    }

    private function generateParentAccount($request)
    {
        $register = new RegisteredUserController;
        $parentId = $register->generateParentId();
        $details = $request->parent_details;
        $username = generate_username($details->first_name);
        $password = random_int(100000000, 999999999);

        $data = [
            'first_name' => $details->first_name,
            'middle_name' => $details->middle_name,
            'last_name' => $details->last_name,
            'date_of_birth' => $details->birth_date,
            'sex' => $details->sex,
            'user_id' => $parentId,
            'user_type' => 'parent',
            'username' => $username,
            'password' => $password,
            'activate' => 1,
            'parent_role' => $details->parent_role,
            'work_occupation' => $details->work_occupation,
        ];
        $name = $data['first_name'].' '.$data['middle_name'].' '.$data['last_name'];

        $data = (object) $data;
        $register->createUser($data);

        return [
            'id' => $parentId,
            'name' => $name,
            'username' => $username,
            'password' => $password,
        ];
    }

    public function destroy(Request $request)
    {
        $reason = $request->reason;
        $parent = ParentRegistrationRequest::find($request->id);
        $parentEmail = $parent->value('email');

        Mail::to($parentEmail)
            ->send(new ParentRejectMail($reason));
        $parent->delete();

        return response()->json([
            'message' => 'Parent Request Reject Successfully',
        ]);
    }

    public function getParentRequest($id)
    {
        return ParentRegistrationRequest::find($id);
    }
}
