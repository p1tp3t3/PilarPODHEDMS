<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Modules\AbsentForm\AbsentFormController;
use App\Http\Controllers\Modules\Appointment\AppointmentController;
use App\Http\Controllers\Modules\Complaint\ComplaintController;
use App\Http\Controllers\Modules\GatePass\GatePassController;
use App\Http\Controllers\Modules\Referral\ReferralController;
use App\Models\Admission;
use App\Models\AppointmentRequest;
use App\Models\Complaint;
use App\Models\GatePass;
use App\Models\Prefect;
use App\Models\Referral;
use Illuminate\Support\Facades\DB;

class TransactionController extends Controller
{
    public function getRequests($type)
    {
        $complaint = new ComplaintController;
        $referral = new ReferralController;
        $admission = new AbsentFormController;
        $appointment = new AppointmentController;
        $gatepass = new GatePassController;

        switch ($type) {
            case 'complaint':
                return $complaint->getSentComplaints();
            case 'referral':
                return $referral->getSendReferral();
            case 'admission':
                return $admission->getAllAbsentFormRequest()->get()->toArray();
            case 'appointment':
                return $appointment->getReqList(json: true);
            case 'gatepass':
                return $gatepass->getAllGatePassRequest()->toArray();
        }
    }

    public function getRequestStatus()
    {
        $id = auth()->user()->user_id;

        $complaint = Complaint::where('complainant_id', $id)
            ->where('confirmed_at', null)
            ->where(DB::raw("DATE_FORMAT(created_at, '%Y-%m-%d')"), DB::raw("DATE_FORMAT(NOW(), '%Y-%m-%d')"));
        $referral = Referral::where('faculty_id', $id)
            ->where('created_at', now());
        $admission = Admission::where('student_id', $id)
            ->where('confirmed', null)
            ->where(DB::raw("DATE_FORMAT(created_at, '%Y-%m-%d')"), DB::raw("DATE_FORMAT(NOW(), '%Y-%m-%d')"));
        $appointment = AppointmentRequest::where('user_id', $id)
            ->where('created_at', now());
        $gatepass = GatePass::where('user_id', $id)
            ->where(DB::raw("DATE_FORMAT(created_at, '%Y-%m-%d')"), DB::raw("DATE_FORMAT(NOW(), '%Y-%m-%d')"));

        $status = [];

        $status['complaint'] = ($complaint->exists()) ? 'pending' : 'ongoing';
        $admissionNull = $admission->where('confirmed', 1)->exists();
        $admissionApproved = $admission->where('confirmed', 1)->exists();

        $gatepassNull = $gatepass->whereNot('confirmed_at', null)->exists();
        $gatepassApproved = $gatepass->whereNot('confirmed_at', null)->exists();

        switch (auth()->user()->user_type) {
            case 'itrc':
                $status['gatepass'] = (($gatepassNull) ? ($gatepassApproved ? 'approve' : 'pending') : 'none');
                break;
            case 'student':
                $status['admission'] = (($admissionNull) ? ($admissionApproved ? 'approve' : 'pending') : 'none');
                $status['gatepass'] = (($gatepassNull) ? ($gatepassApproved ? 'approve' : 'pending') : 'none');
                break;
            case 'faculty':
                $status['referral'] = (($gatepassNull) ? ($gatepassApproved ? 'approve' : 'pending') : 'none');
                $status['gatepass'] = (($gatepassNull) ? ($gatepassApproved ? 'approve' : 'pending') : 'none');
                break;
            case 'administrative':
                $status['referral'] = (($gatepassNull) ? ($gatepassApproved ? 'approve' : 'pending') : 'none');
                $status['gatepass'] = (($gatepassNull) ? ($gatepassApproved ? 'approve' : 'pending') : 'none');
                break;
            case 'staff':
                $status['gatepass'] = (($gatepassNull) ? ($gatepassApproved ? 'approve' : 'pending') : 'none');
                break;
        }

        return response()->json($status);
    }

    public function getLimit()
    {
        $limit = Prefect::with(['user' => function ($q) {
            $q->where('activate', 1);
        }])->get()->toArray();

        $complaint = Complaint::where(DB::raw("DATE_FORMAT(created_at, '%Y-%m-%d')"), DB::raw("DATE_FORMAT(NOW(), '%Y-%m-%d')"))->count();
        $gatepass = GatePass::where(DB::raw("DATE_FORMAT(created_at, '%Y-%m-%d')"), DB::raw("DATE_FORMAT(NOW(), '%Y-%m-%d')"))->count();

        switch (auth()->user()->user_type) {
            case 'itrc':
                $limit = [
                    'complaint' => [
                        'limit' => $limit[0]['complaint_report_limit'],
                        'requested' => $complaint,
                    ],
                    'gatepass' => [
                        'limit' => $limit[0]['gatepass_request_limit'],
                        'requested' => $gatepass,
                    ],
                ];
                break;
            case 'student':
                $limit = [
                    'complaint' => [
                        'limit' => $limit[0]['complaint_report_limit'],
                        'requested' => $complaint,
                    ],
                    'gatepass' => [
                        'limit' => $limit[0]['gatepass_request_limit'],
                        'requested' => $gatepass,
                    ],
                    'admission' => [
                        'limit' => $limit[0]['admission_request_limit'],
                        'requested' => Admission::get()->count(),
                    ],
                ];
                break;
            case 'faculty':
                $limit = [
                    'complaint' => [
                        'limit' => $limit[0]['complaint_report_limit'],
                        'requested' => $complaint,
                    ],
                    'gatepass' => $limit[0]['gatepass_request_limit'],
                    'referral' => $limit[0]['referral_report_limit'],
                ];
                break;
            case 'administrative':
                $limit = [
                    'complaint' => [
                        'limit' => $limit[0]['complaint_report_limit'],
                        'requested' => $complaint,
                    ],
                    'gatepass' => $limit[0]['gatepass_request_limit'],
                    'referral' => $limit[0]['referral_report_limit'],
                ];
                break;
            case 'staff':
                $limit = [
                    'complaint' => [
                        'limit' => $limit[0]['complaint_report_limit'],
                        'requested' => $complaint,
                    ],
                    'gatepass' => $limit[0]['gatepass_request_limit'],
                ];
                break;
            case 'parent':
                $limit = [
                    'complaint' => [
                        'limit' => $limit[0]['complaint_report_limit'],
                        'requested' => $complaint,
                    ],
                ];
                break;
        }

        return $limit;
    }

    public function validateAllowableUserRequests($type)
    {
        $prefectAllow = Prefect::where('activate', 1)->get([$type])->toArray();
        $prefectAllow = $prefectAllow[$type];

    }
}
