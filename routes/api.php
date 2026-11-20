<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\Auth\DashboardController;
use App\Http\Controllers\Modules\AbsentForm\AbsentFormController;
use App\Http\Controllers\Modules\Account\AccountController;
use App\Http\Controllers\Modules\Appointment\AppointmentController;
use App\Http\Controllers\Modules\Complaint\ComplaintController;
use App\Http\Controllers\Modules\Family\ParentController;
use App\Http\Controllers\Modules\GatePass\GatePassController;
use App\Http\Controllers\Modules\Referral\ReferralController;
use App\Http\Controllers\Modules\Report\ArchiveController;
use App\Http\Controllers\Modules\Report\ReportController;
use App\Http\Controllers\Modules\System\MaintenanceController;
use App\Http\Controllers\Modules\System\RoleController;
use App\Http\Controllers\Modules\System\SchoolYearController;
use App\Http\Controllers\Modules\System\SecurityMonitorController;
use App\Http\Controllers\Modules\Violation\ViolationController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\Resource\FileController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| JSON endpoints (all under /api)
|--------------------------------------------------------------------------
|
| The app's own frontend calls these with the signed-in session ('web'), so
| each group below has the same access rules as the matching group of pages
| in routes/auth.php.
|
| A route with ->middleware('list-data') is a list page's table data:
| GET /api/x answers with the lists of the page at /x (list_page() in its
| controller action). The page calls it once it opens (useListData() on the
| frontend) and gets every row; the tables paginate in the browser.
|
*/

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::middleware('web')->group(function () {

    /*
    | role:super_admin
    */
    Route::middleware(['role:super_admin', 'activate', 'user-activity'])->group(function () {
        Route::post('/user-graph', [DashboardController::class, 'getUserGraphRoute']);
        Route::get('/super-admin/user-accounts', [AccountController::class, 'index'])->middleware('list-data');
        Route::get('/super-admin/staff-list', [AccountController::class, 'staffListIndex'])->middleware('list-data');
        Route::get('/super-admin/positions', [AccountController::class, 'positionsPageIndex'])->middleware('list-data');
        Route::get('/super-admin/student-list', [AccountController::class, 'studentListIndex'])->middleware('list-data');
        Route::get('/super-admin/parent-request-list', [ParentController::class, 'index'])->middleware('list-data');
        Route::get('/super-admin/program', [MaintenanceController::class, 'programIndex'])->middleware('list-data');
        Route::get('/super-admin/program/{id}/users', [MaintenanceController::class, 'programUsersIndex'])->middleware('list-data');
        Route::get('/super-admin/roles', [RoleController::class, 'index'])->middleware('list-data');
        Route::get('/super-admin/school-year', [SchoolYearController::class, 'index'])->middleware('list-data');
        Route::get('/super-admin/security-monitor', [SecurityMonitorController::class, 'index'])->middleware('list-data');
        Route::get('/super-admin/report/{section}', [ReportController::class, 'itrcIndex'])->whereIn('section', ['statistics', 'action-log', 'account-activity', 'account-setup', 'enrollment', 'generator', 'generated'])->middleware('list-data');
    });

    /*
    | role:student
    */
    Route::middleware(['role:student', 'activate', 'user-activity'])->group(function () {
        Route::get('/absent-form', [AbsentFormController::class, 'index'])->middleware('list-data');
    });

    /*
    | role:sub_admin (prefect)
    */
    Route::middleware(['role:sub_admin', 'activate', 'user-activity'])->group(function () {
        Route::get('/prefect/complaints', [ComplaintController::class, 'index'])->middleware('list-data');
        Route::get('/prefect/referrals', [ReferralController::class, 'index'])->middleware('list-data');
        Route::get('/prefect/absent-form', [AbsentFormController::class, 'index'])->middleware('list-data');
        Route::get('/prefect/gatepass', [GatePassController::class, 'index'])->middleware('list-data');
        Route::get('/prefect/staff-list', [AccountController::class, 'staffListIndex'])->middleware('list-data');
        Route::get('/prefect/parent-list', [AccountController::class, 'parentListIndex'])->middleware('list-data');
        Route::get('/prefect/user-list', [AccountController::class, 'userListIndex'])->middleware('list-data');
        Route::get('/prefect/archive', [ArchiveController::class, 'index'])->middleware('list-data');
        Route::get('/violation-management/violations', [MaintenanceController::class, 'violationManagementIndex'])->defaults('section', 'violations')->middleware('list-data');
        Route::get('/violation-management/penalties', [MaintenanceController::class, 'violationManagementIndex'])->defaults('section', 'penalties')->middleware('list-data');
        Route::get('/violation-management/student-violations', [MaintenanceController::class, 'violationManagementIndex'])->defaults('section', 'student-violations')->middleware('list-data');
        Route::get('/violation-management/{id}/students', [ViolationController::class, 'violationStudentsIndex'])->middleware('list-data');
        Route::get('/prefect/interventions', [\App\Http\Controllers\Modules\Violation\InterventionController::class, 'index'])->middleware('list-data');
        Route::get('/prefect/report/action-log', [ReportController::class, 'prefectActionLogIndex'])->middleware('list-data');
        Route::get('/prefect/report/{section}', [ReportController::class, 'index'])
            ->whereIn('section', ['incident', 'violation', 'tardy', 'appointment', 'gatepass', 'analytics', 'saved-filters', 'generated'])->middleware('list-data');
    });

    /*
    | role:program_head,faculty (their own program)
    */
    Route::middleware(['role:program_head,faculty', 'activate', 'user-activity'])->group(function () {
        Route::get('/program/student-list', [AccountController::class, 'studentListIndex'])->middleware('list-data');
        Route::get('/program/faculty-list', [AccountController::class, 'facultyListIndex'])->middleware('list-data');
        Route::get('/program/account-files', [AccountController::class, 'programAccountFilesIndex'])->middleware('list-data');
    });

    /*
    | role:parent
    */
    Route::middleware(['role:parent', 'activate', 'user-activity'])->group(function () {
        Route::get('/children/monitor', [AccountController::class, 'childrenListIndex'])->middleware('list-data');
    });

    /*
    | role:non_teaching_staff (guidance is a position; the controller checks it)
    */
    Route::middleware(['role:non_teaching_staff', 'activate', 'user-activity'])->group(function () {
        Route::get('/guidance/referral', [ReferralController::class, 'guidanceIndex'])->middleware('list-data');
    });

    /*
    | auth, activate, user-activity (any signed-in, active role)
    */
    Route::middleware(['auth', 'activate', 'user-activity'])->group(function () {
        Route::post('/bargraph', [DashboardController::class, 'getBargraph']);
        // Dashboard panels (New Users / New Students / Appointments); the
        // controller checks each panel against the user's role.
        Route::get('/dashboard/panel/{panel}', [DashboardController::class, 'panel'])
            ->whereIn('panel', ['new-users', 'new-students', 'appointments', 'security']);
        Route::get('/my-activity', [ActivityLogController::class, 'index'])->middleware('list-data');

        // All / Unread lists for the notifications page and the header's
        // notification dropdown. {id} is the user's encrypted id and must be
        // the signed-in user's own.
        Route::get('/notification/list/{type}/{id}/{lim}', [NotificationController::class, 'getNotifType'])
            ->whereIn('type', ['all', 'unread'])
            ->whereNumber('lim');
        Route::get('/notification/{type}', [NotificationController::class, 'getStudentNotification']);

        Route::get('/notifications', [NotificationController::class, 'index'])->middleware('list-data');
        Route::get('/student-violation/{id}', [ViolationController::class, 'studentViolationIndex'])->middleware('list-data');
        Route::get('/offense-list', [ViolationController::class, 'getOffenseList']);
        Route::get('/penalty-list', [ViolationController::class, 'getPenaltyList']);
        Route::post('/student/violation/predict', [ViolationController::class, 'predictViolationRisk']);
        Route::post('/student/violation/recommend', [ViolationController::class, 'recommendViolationAction']);

        Route::get('/all-users/{type}', [AccountController::class, 'searchAllUsers']);
        Route::get('/user-account/file', [FileController::class, 'getUserAccountZipFileList']);
        Route::get('/user-account/file/{fileName}/preview', [FileController::class, 'previewAccountFile']);
        Route::get('/user-account/file/{fileName}/preview-entry', [FileController::class, 'previewAccountFileEntry']);

        Route::get('/complaint', [ComplaintController::class, 'index'])->middleware('list-data');
        Route::get('/referral', [ReferralController::class, 'index'])->middleware('list-data');
        Route::get('/gatepass', [GatePassController::class, 'index'])->middleware('list-data');
        Route::get('/appointment', [AppointmentController::class, 'index'])->middleware('list-data');
    });

    /*
    | auth, activate, profile-authorized (who may open that profile)
    */
    Route::middleware(['auth', 'activate', 'profile-authorized', 'user-activity'])->group(function () {
        Route::get('/profile/{username}', [ProfileController::class, 'index'])->middleware('list-data');
    });

    /*
    | auth, activate
    */
    Route::middleware(['auth', 'activate'])->group(function () {
        Route::get('/password/verify/{value}/{id}', [AccountController::class, 'checkCurrentPassword']);
    });
});
