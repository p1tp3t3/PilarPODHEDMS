<?php

use App\Http\Controllers\Modules\AbsentForm\AbsentFormController;
use App\Http\Controllers\Modules\System\BackupController;
use App\Http\Controllers\Modules\Complaint\ComplaintController;
use App\Http\Controllers\Modules\GatePass\GatePassController;
use App\Http\Controllers\Modules\Referral\ReferralController;
use App\Http\Controllers\Modules\Account\RegisteredUserController;
use App\Http\Controllers\Auth\DashboardController;
use App\Http\Controllers\Modules\Account\AccountController;
use App\Http\Controllers\Modules\Violation\ViolationController;
use App\Http\Controllers\Modules\Violation\ViolationAccessController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Modules\Appointment\AppointmentController;
use App\Http\Controllers\Modules\Report\ArchiveController;
use App\Http\Controllers\Modules\Chat\ChatController;
use App\Http\Controllers\Modules\System\MaintenanceController;
use App\Http\Controllers\Modules\Family\ParentController;
use App\Http\Controllers\Modules\Report\ReportController;
use App\Http\Controllers\Modules\System\SystemSettingsController;
use App\Http\Controllers\Modules\System\SchoolYearController;
use App\Http\Controllers\Resource\FileController;
use App\Http\Controllers\Resource\WebPushController;
use App\Http\Controllers\TransactionController;
use App\Models\User;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| role:super_admin
|--------------------------------------------------------------------------
*/
Route::middleware(['role:super_admin', 'activate', 'user-activity'])->group(function() {

     Route::get('/maintenance', [MaintenanceController::class, 'index']);
     Route::get('/maintenance/preview', [MaintenanceController::class, 'preview']);
     Route::post('/maintenance/program/create', [MaintenanceController::class, 'programStore']);
     Route::post('/maintenance/program/update', [MaintenanceController::class, 'updateProgram']);
     Route::post('/maintenance/program/delete', [MaintenanceController::class, 'destroyProgram']);
     Route::post('/maintenance/mode/toggle', [MaintenanceController::class, 'toggleMaintenanceMode']);

     Route::get('/maintenance/backups', [BackupController::class, 'index']);
     Route::post('/maintenance/backups/database', [BackupController::class, 'createDatabaseBackup']);
     Route::post('/maintenance/backups/storage', [BackupController::class, 'createStorageBackup']);
     Route::post('/maintenance/backups/full', [BackupController::class, 'createFullBackup']);
     Route::get('/maintenance/backups/{filename}/download', [BackupController::class, 'download']);
     Route::post('/maintenance/backups/{filename}/delete', [BackupController::class, 'destroy']);

     Route::get('/super-admin/user-accounts', [AccountController::class, 'index'])
         ->name('type.super-admin.accounts');

     Route::get('/super-admin/staff-list', [AccountController::class, 'staffListIndex']);

     Route::get('/super-admin/profile/{id}', [ProfileController::class, 'index']);

     Route::get('/super-admin/accounts/register', [RegisteredUserController::class, 'index']);

     Route::post('/super-admin/register', [RegisteredUserController::class, 'store']);
     Route::post('/super-admin/register/upload-user', [RegisteredUserController::class, 'uploadUserStore']);
     Route::post('/super-admin/register/preview-student-csv', [RegisteredUserController::class, 'previewStudentCsv']);
     Route::post('/super-admin/register/validate-student-csv-row', [RegisteredUserController::class, 'validateStudentCsvRowRequest']);
     Route::post('/super-admin/register/commit-student-csv', [RegisteredUserController::class, 'commitStudentCsv']);
     Route::get('/api/register/validate/{type}/{value}/{id?}', [AccountController::class, 'validateUser']);

     Route::post('/super-admin/accounts/activation/{username}', [AccountController::class, 'toggle']);

     Route::post('/super-admin/user-accounts/del', [AccountController::class, 'destroy']);

     Route::get('/super-admin/student-list', [AccountController::class, 'studentListIndex']);

     Route::post('/super-admin/student/update-enrollment', [AccountController::class, 'updateEnrollment']);
     Route::post('/super-admin/student/preview-enrollment-update-csv', [AccountController::class, 'previewEnrollmentUpdateCsv']);
     Route::post('/super-admin/student/validate-enrollment-update-csv-row', [AccountController::class, 'validateEnrollmentUpdateCsvRowRequest']);
     Route::post('/super-admin/student/commit-enrollment-update-csv', [AccountController::class, 'commitEnrollmentUpdateCsv']);

     Route::get('/super-admin/parent-request-list', [ParentController::class, 'index']);

     Route::get('/super-admin/parent-register/get/{id}', [ParentController::class, 'getParentRequest']);

     Route::get('/super-admin/school-year', [SchoolYearController::class, 'index']);
     Route::post('/super-admin/school-year/create', [SchoolYearController::class, 'store']);
     Route::post('/super-admin/school-year/activate', [SchoolYearController::class, 'activate']);
     Route::post('/super-admin/school-year/semester/activate', [SchoolYearController::class, 'activateSemester']);
     Route::post('/super-admin/school-year/close', [SchoolYearController::class, 'close']);
     Route::post('/super-admin/school-year/delete', [SchoolYearController::class, 'destroy']);

     Route::get('/super-admin/program', [MaintenanceController::class, 'programIndex']);
     Route::get('/super-admin/program/{id}/users', [MaintenanceController::class, 'programUsersIndex']);
     Route::post('/super-admin/user-accounts/file/del', [FileController::class, 'destroy']);
     Route::get('/super-admin/report', [ReportController::class, 'itrcIndex']);
     Route::get('/super-admin/report/generate', [ReportController::class, 'actionLogStore']);
     Route::get('/super-admin/report/statistics-preview', [ReportController::class, 'accountStatisticsPreview']);
     Route::post('/super-admin/report/statistics/generate', [ReportController::class, 'generateAccountStatisticsReport']);
     Route::get('/super-admin/report/download/{id}', [ReportController::class, 'downloadReport'])->name('super-admin.report.download');
     Route::get('/super-admin/report/view/{id}', [ReportController::class, 'viewReport'])->name('super-admin.report.view');

     Route::post('/super-admin/account/update', [AccountController::class, 'updateUserInformation']);

     Route::post('/super-admin/staff/position/assign', [AccountController::class, 'assignStaffPosition']);
     Route::post('/super-admin/staff/position/remove', [AccountController::class, 'removeStaffPosition']);

     Route::get('/super-admin/staff/positions', [AccountController::class, 'positionIndex']);
     Route::post('/super-admin/staff/positions/create', [AccountController::class, 'positionStore']);
     Route::post('/super-admin/staff/positions/update', [AccountController::class, 'updatePosition']);
     Route::post('/super-admin/staff/positions/delete', [AccountController::class, 'destroyPosition']);

     Route::get('/system-settings', [SystemSettingsController::class, 'index']);
     Route::post('/system-settings/login-portal-password', [SystemSettingsController::class, 'updateLoginPortalPassword']);
     Route::post('/system-settings/mail-config', [SystemSettingsController::class, 'updateMailConfig']);
     Route::post('/system-settings/mail-config/test', [SystemSettingsController::class, 'sendTestMail']);
     Route::post('/system-settings/app-name', [SystemSettingsController::class, 'updateAppName']);
     Route::post('/system-settings/archive-retention', [SystemSettingsController::class, 'updateArchiveRetention']);
});

/*
|--------------------------------------------------------------------------
| role:super_admin,sub_admin
|--------------------------------------------------------------------------
*/
Route::middleware(['role:super_admin,sub_admin', 'activate', 'user-activity'])->group(function() {
     Route::get('/violation-management', [MaintenanceController::class, 'violationManagementIndex']);
     Route::get('/violation-management/{id}/students', [ViolationController::class, 'violationStudentsIndex']);

     Route::middleware(['violation-edit-authorized:violation,add'])
          ->post('/maintenance/violation/create', [MaintenanceController::class, 'offenseStore']);
     Route::middleware(['violation-edit-authorized:violation,edit'])
          ->post('/maintenance/violation/update', [MaintenanceController::class, 'updateOffense']);
     Route::middleware(['violation-edit-authorized:violation,delete'])
          ->post('/maintenance/violation/delete', [MaintenanceController::class, 'destroyOffense']);
     Route::middleware(['violation-edit-authorized:penalty,add'])
          ->post('/maintenance/penalty/create', [MaintenanceController::class, 'penaltyStore']);
     Route::middleware(['violation-edit-authorized:penalty,delete'])
          ->post('/maintenance/penalty/delete', [MaintenanceController::class, 'destroyPenalty']);

     Route::post('/violation-access/request', [ViolationAccessController::class, 'request']);
     Route::get('/violation-access/status', [ViolationAccessController::class, 'status']);
     Route::get('/violation-access', [ViolationAccessController::class, 'index']);
     Route::post('/violation-access/{id}/approve', [ViolationAccessController::class, 'approve']);
     Route::post('/violation-access/{id}/deny', [ViolationAccessController::class, 'deny']);
     Route::post('/violation-access/{id}/revoke', [ViolationAccessController::class, 'revoke']);
});

/*
|--------------------------------------------------------------------------
| role:super_admin,sub_admin,teaching_staff
|--------------------------------------------------------------------------
*/
Route::middleware(['role:super_admin,sub_admin,teaching_staff', 'activate', 'user-activity'])
     ->get('/download/user/account/{fileName}', [FileController::class, 'downloadAccountFile']);

/*
|--------------------------------------------------------------------------
| role:student
|--------------------------------------------------------------------------
*/
Route::middleware(['role:student', 'activate', 'user-activity'])->group(function() {
    Route::get('/student/profile/{id}', [ProfileController::class, 'index']);

    Route::get('/absent-form', [AbsentFormController::class, 'index']);
    Route::post('/student/absent-form/create', [AbsentFormController::class, 'store']);
    Route::post('/student/absent-form/{id}/update', [AbsentFormController::class, 'updateAbsentForm']);
    Route::post('/student/absent-form/{id}/revoke', [AbsentFormController::class, 'revokeAbsentForm']);
});

/*
|--------------------------------------------------------------------------
| role:sub_admin
|--------------------------------------------------------------------------
*/
Route::middleware(['role:sub_admin', 'activate', 'user-activity'])->group(function() {
    Route::get('/prefect/student-list', [AccountController::class, 'studentListIndex']);
    Route::get('/prefect/staff-list', [AccountController::class, 'staffListIndex']);
    Route::get('/prefect/parent-list', [AccountController::class, 'parentListIndex']);
    Route::get('/prefect/user-list', [AccountController::class, 'userListIndex']);

    Route::get('/prefect/archive', [ArchiveController::class, 'index']);

    Route::post('/prefect/call-in', [NotificationController::class, 'notifyCallIn']);
    Route::post('/prefect/violation/risk/notify', [NotificationController::class, 'notifyFacultyProgramHead']);
    Route::post('/prefect/violation/create', [ViolationController::class, 'store']);

    Route::get('/prefect/profile/{id}', [ProfileController::class, 'index']);

    Route::get('/prefect/complaints', [ComplaintController::class, 'index']);

    Route::get('/prefect/referrals', [ReferralController::class, 'index']);
    Route::get('/prefect/absent-form', [AbsentFormController::class, 'index']);
    Route::post('/prefect/absent-form/verify/{id}/confirm', [AbsentFormController::class, 'confirmAbsentForm']);
    Route::post('/prefect/absent-form/verify/{id}/cancel', [AbsentFormController::class, 'cancelAbsentForm']);
    Route::get('/prefect/appointment', [AppointmentController::class, 'index']);

    Route::post('/prefect/gatepass/verify/{id}/confirm', [GatePassController::class, 'approveGatePassRequest']);
    Route::post('/prefect/gatepass/verify/{id}/cancel', [GatePassController::class, 'disapproveGatePassRequest']);

    Route::get('/prefect/gatepass', [GatePassController::class, 'index']);

    Route::post('/referral/verify/{id}/confirm', [ReferralController::class, 'confirmReferral']);
    Route::get('/referral/verify/{id}/send-guidance', [ReferralController::class, 'printReferralGuidance']);
    Route::get('/referral/verify/{id}/send-it-staff', [ReferralController::class, 'printReferralToItStaff']);
    Route::post('/referral/verify/{id}/cancel', [ReferralController::class, 'destroy']);

    Route::get('/download/{type}/{id}', [ArchiveController::class, 'downloadDocument']);

    Route::get('/prefect/report', [ReportController::class, 'index']);
    Route::post('/prefect/analytic-report/generate', [ReportController::class, 'generateAnalyticReport']);
    Route::get('/prefect/analytics/preview', [ReportController::class, 'analyticsPreview']);
    Route::post('/prefect/report/generate', [ReportController::class, 'store']);
    Route::get('/prefect/report/download/{id}', [ReportController::class, 'downloadReport'])->name('prefect.report.download');
    Route::get('/prefect/report/view/{id}', [ReportController::class, 'viewReport'])->name('prefect.report.view');
    Route::post('/prefect/report/check-duplicate', [ReportController::class, 'checkDuplicateReport']);
    Route::get('/prefect/report/history', [ReportController::class, 'reportHistory']);
    Route::post('/prefect/report/delete/{id}', [ReportController::class, 'destroyReport']);
    Route::get('/prefect/report-filter', [ReportController::class, 'reportFilterIndex']);
    Route::post('/prefect/report-filter', [ReportController::class, 'storeReportFilter']);
    Route::post('/prefect/report-filter/{id}/update', [ReportController::class, 'updateReportFilterRequest']);
    Route::post('/prefect/report-filter/{id}/delete', [ReportController::class, 'destroyReportFilter']);
    Route::post('/prefect/report-filter/{id}/generate', [ReportController::class, 'generateFromFilter']);
    Route::post('/prefect/archive/recover', [ArchiveController::class, 'recoverDocument']);
    Route::post('/prefect/archive/delete', [ArchiveController::class, 'destroy']);
    Route::post('/prefect/archive/transfer', [ArchiveController::class, 'transfer']);
    Route::post('/prefect/archive/bulk', [ArchiveController::class, 'bulkArchive']);
});

/*
|--------------------------------------------------------------------------
| role:teaching_staff
|--------------------------------------------------------------------------
*/
Route::middleware(['role:teaching_staff', 'activate', 'user-activity'])->group(function() {
    Route::get('/teaching-staff/profile/{id}', [ProfileController::class, 'index']);
    Route::get('/teaching-staff/student-list', [AccountController::class, 'studentListIndex']);
    Route::get('/teaching-staff/faculty-list', [AccountController::class, 'facultyListIndex']);
    Route::get('/teaching-staff/account-files', [AccountController::class, 'programAccountFilesIndex']);
});

/*
|--------------------------------------------------------------------------
| role:parent
|--------------------------------------------------------------------------
*/
Route::middleware(['role:parent', 'activate', 'user-activity'])->group(function() {
     Route::get('/children/monitor', [AccountController::class, 'childrenListIndex']);
});

/*
|--------------------------------------------------------------------------
| role:non_teaching_staff
|--------------------------------------------------------------------------
| "Guard" and "Guidance" are positions inside non_teaching_staff, not
| separate roles — the position-specific routes below still check
| ReferralController::isGuidance()/GatePassController's guard check
| internally, this middleware only confirms the broader role.
*/
Route::middleware(['role:non_teaching_staff', 'activate', 'user-activity'])->group(function() {
     Route::get('/guidance/referral', [ReferralController::class, 'guidanceIndex']);
});

/*
|--------------------------------------------------------------------------
| auth, activate, user-activity (any authenticated, active role)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'activate', 'user-activity'])->group(function() {
     Route::get('/dashboard', [DashboardController::class, 'index'])
          ->name('auth.dashboard');
     Route::get('/dashboard/active-users', [DashboardController::class, 'getActiveUsers']);

     Route::get('/chat', [ChatController::class, 'index']);
     Route::get('/chat/thread/{userId}', [ChatController::class, 'getThread']);
     Route::post('/chat/send', [ChatController::class, 'store']);
     Route::post('/chat/message/{id}/unsend', [ChatController::class, 'unsendMessage']);
     Route::post('/chat/message/{id}/edit', [ChatController::class, 'editMessage']);
     Route::get('/chat/message/{id}/history', [ChatController::class, 'getEditHistory']);
     Route::get('/chat/unread-count', [ChatController::class, 'unreadCount']);

     Route::get('/appointment', [AppointmentController::class, 'index']);
     Route::post('/prefect/appointment/req/get/{reqId}', [AppointmentController::class, 'getReqList']);

     Route::post('/appointment/request', [AppointmentController::class, 'store']);
     Route::post('/appointment/update/{id}', [AppointmentController::class, 'update']);
     Route::post('/appointment/cancel', [AppointmentController::class, 'cancelAppointment']);
     Route::get('/appointment/cancel', [AppointmentController::class, 'cancelAppointment']);
     Route::post('/appointment/action', [AppointmentController::class, 'action']);
     Route::post('/calendar/appointment/get/list', [AppointmentController::class, 'getAppointment']);
     Route::get('/calendar/appointment/events', [AppointmentController::class, 'calendarEvents']);

     Route::get('/complaint', [ComplaintController::class, 'index']);
     Route::post('/complaint/create', [ComplaintController::class, 'store']);
     Route::post('/complaint/verify/{id}/cancel', [ComplaintController::class, 'cancelComplaint']);
     Route::post('/complaint/{id}/revoke', [ComplaintController::class, 'revokeComplaint']);
     Route::post('/complaint/{id}/edit', [ComplaintController::class, 'updateComplaint']);
     Route::post('/complaint/verify/{id}/confirm', [ComplaintController::class, 'confirmComplaint']);
     Route::post('/complaint/select/{type}', [ComplaintController::class, 'actionMultipleSelect']);
     Route::post('/complainant/get/{id}', [ComplaintController::class, 'get']);
     Route::get('/complaint/{id}/evidence/{fileName}', [ComplaintController::class, 'downloadEvidence']);
     Route::get('/complaint/{id}/previous-evidence/{fileName}', [ComplaintController::class, 'downloadPreviousEvidence']);
     Route::get('/complaint/{id}/subject/{fileName}', [ComplaintController::class, 'downloadSubjectDocument']);

     Route::post('/referral/create', [ReferralController::class, 'store']);
     Route::post('/referral/get/{id}', [ReferralController::class, 'get']);
     Route::post('/referral/{id}/revoke', [ReferralController::class, 'revokeReferral']);
     Route::post('/referral/{id}/edit', [ReferralController::class, 'updateReferral']);

     Route::post('/absent-form/get/{id}', [AbsentFormController::class, 'get']);
     Route::get('/absent-form/{id}/evidence/{fileName}', [AbsentFormController::class, 'downloadEvidence']);
     Route::get('/absent-form/{id}/previous-evidence/{fileName}', [AbsentFormController::class, 'downloadPreviousEvidence']);

     Route::get('/gatepass', [GatePassController::class, 'index']);
     Route::post('/gatepass/create', [GatePassController::class, 'gatepassRequest']);
     Route::post('/gatepass/verify/{id}/cancel', [GatePassController::class, 'disapproveGatePassRequest']);
     Route::post('/gatepass/{id}/revoke', [GatePassController::class, 'revokeGatePass']);
     Route::post('/gatepass/{id}/edit', [GatePassController::class, 'updateGatePass']);
     Route::get('/gatepass/{id}', [GatePassController::class, 'get']);
     Route::get('/gatepass/approved-users', [GatePassController::class, 'getAllApprovedGatePass']);

     Route::get('/notification/{receiver}/{l}', [NotificationController::class, 'getNotif']);
     Route::get('/api/notification/{type}', [NotificationController::class, 'getStudentNotification']);
     Route::get('/notifications', [NotificationController::class, 'index']);
     Route::post('/notifications/delete/{type}', [NotificationController::class, 'destroy']);
     Route::post('/notification/read', [NotificationController::class, 'markAsRead']);

     Route::post('/store-subscription', [WebPushController::class, 'store']);

     Route::get('/transaction/limit', [TransactionController::class, 'getLimit']);

     Route::get('/student-risk/{id}', [ViolationController::class, 'studentRiskIndex']);
     Route::get('/student-violation/{id}', [ViolationController::class, 'studentViolationIndex']);
     Route::get('/incident/list/{id}', [ViolationController::class, 'getStudentIncident']);
     Route::get('/violation/list/{id}', [ViolationController::class, 'getStudentViolation']);
     Route::get('/violation-occurence/list/{id}', [ViolationController::class, 'getStudentViolationOccurence']);
     Route::get('/incident/student/{id}', [ViolationController::class, 'getStudentRiskStatus']);
     Route::get('/api/student/violation/{violation}/{studentId}', [ViolationController::class, 'getStudentBehaviourAnalysisResult']);

     Route::post('/profile/{username}/edit', [ProfileController::class, 'update']);
     Route::get('/profile/{username}/edit', [ProfileController::class, 'edit']);

     Route::get('/all-users', function() {
          $account = new User();
          return $account->allUserAccount();
     });
     Route::get('/api/all-users/{type}', [AccountController::class, 'searchAllUsers']);
     Route::get('/api/user-account/file', [FileController::class, 'getUserAccountZipFileList']);
     Route::get('/api/user-account/file/{fileName}/preview', [FileController::class, 'previewAccountFile']);
     Route::get('/api/user-account/file/{fileName}/preview-entry', [FileController::class, 'previewAccountFileEntry']);
     Route::get('/all-students', function() {
          return User::with(['profile', 'program'])->where('role', 'student')->get();
     });
     Route::get('/settings/{id}', [AccountController::class, 'accountSettingsIndex']);
     Route::get('/referral', [ReferralController::class, 'index']);

});

/*
|--------------------------------------------------------------------------
| auth, activate (no user-activity ping)
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'activate'])->group(function() {
     Route::post('/account/update', [AccountController::class, 'update']);
     Route::get('/api/password/verify/{value}/{id}', [AccountController::class, 'checkCurrentPassword']);
     Route::post('/account-setup/complete', [\App\Http\Controllers\AccountSetupController::class, 'complete']);
     Route::get('/force-change/{username}', [\App\Http\Controllers\AccountSetupController::class, 'showStep']);

     Route::get('/verify-email', [\App\Http\Controllers\AccountSetupController::class, 'verifyEmailPrompt'])
          ->name('verification.notice');
     Route::get('/verify-email/{id}/{hash}', \App\Http\Controllers\Auth\VerifyEmailController::class)
          ->middleware('signed')
          ->name('verification.verify');
     Route::post('/email/verification-notification', [\App\Http\Controllers\AccountSetupController::class, 'resendVerificationEmail'])
          ->name('verification.send');
});

/*
|--------------------------------------------------------------------------
| auth, activate, profile-authorized, user-activity
|--------------------------------------------------------------------------
*/
Route::middleware(['auth', 'activate', 'profile-authorized', 'user-activity'])
     ->get('/profile/{username}', [ProfileController::class, 'index']);

Route::middleware(['auth', 'activate'])
     ->get('/profile/id/{id}', [ProfileController::class, 'redirectById']);

/*
|--------------------------------------------------------------------------
| No auth middleware (left as-is: reachable without a logged-in session)
|--------------------------------------------------------------------------
*/
Route::post('/gatepass/verify/{source}/scan', [GatePassController::class, 'verifyGatePassQRCode']);
Route::post('/gatepass/approved-users', [GatePassController::class, 'getAllApprovedGatePass']);
Route::post('/appointment/schedule/{id}/{type}', [AppointmentController::class, 'get']);
