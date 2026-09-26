<?php
use App\Http\Controllers\Modules\Account\AccountController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Modules\GatePass\GatePassController;
use App\Http\Controllers\Modules\Family\ParentController;
use App\Http\Controllers\Modules\Account\RegisteredUserController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\OTPVerificationController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', [AuthenticatedSessionController::class, 'create'])
->name('type.user');

Route::get('/login', [AuthenticatedSessionController::class, 'create'])
->name('login');

Route::get('/parent-register', [RegisteredUserController::class, 'parentRegistrationIndex']);

Route::post('/parent-register/send', [ParentController::class, 'store']);

Route::get('/parent-register/confirm/{token}', [ParentController::class, 'confirm'])
->name('parent-register.confirm');


Route::get('/gatepass/log-in', [AuthenticatedSessionController::class, 'gatePassLogin'])
     ->name('gatepass.login');

Route::get('/super-admin/login/{password}', [AuthenticatedSessionController::class, 'maintenanceLoginCreate'])
     ->name('super-admin.maintenance-login');

Route::post('/super-admin/login/{password}', [AuthenticatedSessionController::class, 'maintenanceLoginStore'])
     ->name('super-admin.maintenance-login.attempt');

Route::post('/log-in', [AuthenticatedSessionController::class, 'store'])
     ->name('log-in');

Route::post('/contact/{username}', [AccountController::class, 'getContact']);

Route::get('/forgot-password', [PasswordResetController::class, 'requestIndex'])
->name('password.request');

Route::post('/forgot-password/send-link', [PasswordResetController::class, 'sendLink'])
->name('password.send-link');

Route::get('/reset-password/{username}', [PasswordResetController::class, 'resetForm'])
->name('password.reset.form');

Route::post('/reset-password/{username}', [PasswordResetController::class, 'reset'])
->name('password.reset');

// Still used by account-settings-form.jsx's voluntary "change my password"
// identity-verification step — unrelated to forgot-password/parent
// registration, which no longer use OTP at all.
Route::post('/otp/verify', [OTPVerificationController::class, 'verify']);

Route::post('/forgot-password/otp', [OTPVerificationController::class, 'store'])
->name('verify.send_otp');

Route::middleware('auth')
     ->get('/log-out', [AuthenticatedSessionController::class, 'destroy'])
     ->name('log-out');

Route::middleware(['auth', 'activate'])
     ->get('/gatepass-verification', [GatePassController::class, 'qrcodeIndex'])
     ->name('gatepass-validation');

Route::get('/webpush', function() {
     return Inertia::render('test', ['keys' => 't']);
});

require __DIR__ . '/auth.php';


