<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;


$app = Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trusts the loopback interface as a proxy so requests forwarded by
        // the local Vite dev server (used to route a single ngrok tunnel to
        // both Vite and Laravel) carry X-Forwarded-Proto through correctly —
        // otherwise Laravel thinks every tunneled request is plain HTTP and
        // generates http:// URLs (route(), url(), asset()) on an https page,
        // which browsers block as mixed content.
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
    ->withExceptions(function (Exceptions $exceptions): void {
        if (env('APP_ENV') === 'local' && env('NGROK_URL')) {
            $exceptions->shouldRenderJsonWhen(
                fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
            );
        }
    });

// withExceptions() must always run — it's what binds Laravel's exception
// handler into the container at all, not just the ngrok-specific JSON
// customization below. Skipping the call entirely whenever NGROK_URL isn't
// set (the previous ternary) left every request/command without an
// ExceptionHandler binding, so any error anywhere became an unrenderable
// "Target [Illuminate\Contracts\Debug\ExceptionHandler] is not
// instantiable" crash instead of the actual error.
return $app->create();
