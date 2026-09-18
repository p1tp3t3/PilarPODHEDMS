<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Console\Scheduling\Schedule;


$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        
        if(env('APP_ENV') === 'local' && env('NGROK_URL'))
            $middleware->trustProxies(at: [parse_url(env('NGROK_URL'), PHP_URL_HOST)]);

        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
            \App\Http\Middleware\CheckMaintenanceMode::class,
            \App\Http\Middleware\ForceAccountSetup::class,
        ]);
        
        $middleware->alias([
            'activate' => \App\Http\Middleware\Activation::class,
            'user-activity' => \App\Http\Middleware\UserActivity::class,
            'auth' => \App\Http\Middleware\Authenticable::class,
            'profile-authorized' => \App\Http\Middleware\ProfileAuthorization::class,
            'profile-edit-authorized' => \App\Http\Middleware\ProfileUpdateAuthorization::class,
            'children-monitoring-authorized' => \App\Http\Middleware\ChildrenMonitoringAuthorization::class,
            'role' => \App\Http\Middleware\RoleAuthenticable::class,
            'violation-edit-authorized' => \App\Http\Middleware\EnsureViolationEditAccess::class,
        ]);
    })
    ->withSchedule(function (Schedule $schedule): void {
        $schedule->command('app:notify-gate-pass-expiration-command')
                 ->timezone('Asia/Manila')
                 ->dailyAt('08:00');

        $schedule->command('app:notify-unresolved-cases-command')
                 ->yearly()
                 ->timezone('Asia/Manila')
                 ->dailyAt('08:00');

        $schedule->command('app:train-logistic-model-command')
                 ->timezone('Asia/Manila')
                 ->dailyAt('08:00');

        $schedule->command('app:notify-student-violation-prediction-command')
                 ->timezone('Asia/Manila')
                 ->dailyAt('08:00');
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        if (env('APP_ENV') === 'local' && env('NGROK_URL')) {
            $exceptions->shouldRenderJsonWhen(
                fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
            );
        }
    });
    
return $app->create();
