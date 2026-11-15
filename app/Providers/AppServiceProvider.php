<?php

namespace App\Providers;

use App\Http\Controllers\Modules\System\SystemSettingsController;
use Carbon\Carbon;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);


        // The frontend was built against plain arrays/objects everywhere —
        // API Resources default to a {"data": ...} envelope, which would
        // silently break every existing consumer. Keep resources unwrapped
        // so introducing them doesn't change the wire shape.
        JsonResource::withoutWrapping();

        // Re-reads MAIL_USERNAME/MAIL_PASSWORD straight from the environment
        // so a System Settings update (which writes to .env) takes effect
        // even under a cached config (env() bypasses config:cache).
        SystemSettingsController::applyMailConfig();
    }
}

