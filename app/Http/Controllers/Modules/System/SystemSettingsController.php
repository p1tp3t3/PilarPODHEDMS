<?php

namespace App\Http\Controllers\Modules\System;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class SystemSettingsController extends Controller
{
    public function index()
    {
        return Inertia::render('itrc/system-settings', [
            'user' => auth()->user(),
            'has_login_portal_password' => !empty(config('app.maintenance_login_secret')),
            'mail_config' => [
                'username' => config('mail.mailers.smtp.username') ?? '',
                'has_password' => !empty(config('mail.mailers.smtp.password')),
            ],
            'app_name' => config('app.name'),
            'archive_retention_years' => config('app.archive_retention_years'),
        ]);
    }

    public function updateAppName(Request $request)
    {
        $request->validate([
            'app_name' => 'required|string|max:100',
        ]);

        self::setEnvValue('APP_NAME', $request->app_name);
        Artisan::call('config:clear');
        config(['app.name' => $request->app_name]);

        return response()->json(['message' => 'System name updated successfully.', 'app_name' => $request->app_name]);
    }

    public function updateArchiveRetention(Request $request)
    {
        $request->validate([
            'retention_years' => 'required|integer|min:1',
        ]);

        self::setEnvValue('ARCHIVE_RETENTION_YEARS', (string) $request->retention_years);
        Artisan::call('config:clear');
        config(['app.archive_retention_years' => (int) $request->retention_years]);

        return response()->json([
            'message' => 'Archive retention period updated successfully.',
            'archive_retention_years' => (int) $request->retention_years,
        ]);
    }

    public function updateLoginPortalPassword(Request $request)
    {
        $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        self::setEnvValue('MAINTENANCE_LOGIN_SECRET', Hash::make($request->password));
        Artisan::call('config:clear');
        config(['app.maintenance_login_secret' => env('MAINTENANCE_LOGIN_SECRET')]);

        return response()->json(['message' => 'Login portal password updated successfully.']);
    }

    /**
     * Writes straight into .env — this is the single source of truth for
     * mail credentials (no cache indirection, so what's in .env is always
     * exactly what's in effect, and editing .env by hand also just works).
     */
    public function updateMailConfig(Request $request)
    {
        $data = $request->validate([
            'username' => 'nullable|string',
            'password' => 'nullable|string',
        ]);

        if (filled($data['username'] ?? null)) {
            self::setEnvValue('MAIL_USERNAME', $data['username']);
        }
        if (filled($data['password'] ?? null)) {
            self::setEnvValue('MAIL_PASSWORD', $data['password']);
        }

        Artisan::call('config:clear');
        $this->applyMailConfig();

        return response()->json(['message' => 'Mail configuration saved successfully.']);
    }

    public function sendTestMail(Request $request)
    {
        $request->validate([
            'test_email' => 'required|email',
        ]);

        $this->applyMailConfig();

        try {
            Mail::raw('This is a test email from ' . config('app.name') . '. Your mail configuration is working correctly.', function ($message) use ($request) {
                $message->to($request->test_email)->subject('Test Email - ' . config('app.name'));
            });
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Failed to send test email: ' . $e->getMessage()], 422);
        }

        return response()->json(['message' => 'Test email sent successfully. Please check the inbox.']);
    }

    /**
     * Re-reads MAIL_USERNAME/MAIL_PASSWORD from the environment into the
     * runtime config for the remainder of this request — only needed
     * because config:clear (called above) doesn't retroactively update
     * config() values already resolved earlier in the *same* request.
     */
    public static function applyMailConfig(): void
    {
        config([
            'mail.mailers.smtp.username' => env('MAIL_USERNAME'),
            'mail.mailers.smtp.password' => env('MAIL_PASSWORD'),
        ]);
    }

    private static function setEnvValue(string $key, string $value): void
    {
        $path = base_path('.env');
        $content = File::get($path);

        $escaped = preg_match('/[\s"\'#$]/', $value) ? '"' . str_replace('"', '\\"', $value) . '"' : $value;
        $line = "{$key}={$escaped}";

        // preg_replace's replacement string treats "$1"/"$2" etc as
        // backreferences — a bcrypt hash like "$2y$10$..." would get
        // silently mangled if passed there directly, so the replacement is
        // built inside a callback instead, where it's used literally.
        $content = preg_match("/^{$key}=.*/m", $content)
            ? preg_replace_callback("/^{$key}=.*/m", fn () => $line, $content)
            : rtrim($content) . "\n{$line}\n";

        File::put($path, $content);
    }
}
