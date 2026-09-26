<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Auth\AuthenticationException;
use Inertia\Inertia;


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

        $schedule->command('app:archive-expired-gate-pass-command')
                 ->timezone('Asia/Manila')
                 ->dailyAt('00:05');

        $schedule->command('app:notify-unresolved-cases-command')
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
        // Laravel's default auth middleware treats every Inertia/axios
        // request as "expects JSON" (Inertia sends Accept: application/json)
        // and just returns a plain 401 instead of ever redirecting — fine
        // for a background API call (the axios interceptor in bootstrap.js
        // catches that and redirects client-side), but a real Inertia page
        // visit needs the server to answer with Inertia::location() so its
        // router actually navigates the browser to the login page.
        $exceptions->render(function (AuthenticationException $e, Request $request) {
            if (! $request->header('X-Inertia')) {
                return null;
            }

            $referer = $request->headers->get('referer');
            if ($referer && parse_url($referer, PHP_URL_HOST) === $request->getHost()) {
                $path = parse_url($referer, PHP_URL_PATH) ?? '/';
                $query = parse_url($referer, PHP_URL_QUERY);

                $request->session()->put('url.intended', $query ? "{$path}?{$query}" : $path);
            }

            return Inertia::location(route('type.user'));
        });

        if (env('APP_ENV') === 'local' && env('NGROK_URL')) {
            $exceptions->shouldRenderJsonWhen(
                fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
            );
        }
    });
    
return $app->create();
