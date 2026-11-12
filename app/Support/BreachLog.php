<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/** Writes and reads storage/logs/breach-log.log for the Security Monitor. */
class BreachLog
{
    public const TYPES = [
        'failed_login' => 'Failed Login',
        'brute_force' => 'Brute Force',
        'unauthorized_access' => 'Unauthorized Access',
        'forbidden' => 'Forbidden Request',
        'tampered_id' => 'Tampered ID',
        'sql_injection' => 'SQL Injection',
        'xss' => 'XSS Attempt',
        'path_traversal' => 'Path Traversal',
        'scanner_probe' => 'Scanner Probe',
        'csrf_mismatch' => 'CSRF Mismatch',
        'rate_limited' => 'Rate Limited',
        'other' => 'Others',
    ];

    private const LEVELS = ['low' => 'info', 'medium' => 'warning', 'high' => 'alert'];

    private const MAX_READ = 5000;

    public static function record(string $type, string $severity, string $message, array $details = []): void
    {
        try {
            $request = request();
            $user = auth()->user();

            $context = [
                'type' => $type,
                'severity' => $severity,
                'ip' => $request?->ip(),
                'method' => $request?->method(),
                'url' => $request ? Str::limit($request->fullUrl(), 300) : null,
                'user_id' => $user?->id,
                'username' => $user?->username,
                'role' => $user?->role,
                'user_agent' => $request ? Str::limit((string) $request->userAgent(), 300) : null,
            ];
            if ($details) {
                $context['details'] = $details;
            }

            $message = Str::limit(preg_replace('/[\r\n{}]+/', ' ', $message), 300);

            Log::channel('breach')->{self::LEVELS[$severity] ?? 'warning'}($message, $context);
        } catch (\Throwable $e) {
        }
    }

    public static function entries(): array
    {
        $path = storage_path('logs/breach-log.log');
        if (! is_file($path)) {
            return [];
        }

        $lines = self::tail($path, self::MAX_READ);
        $out = [];
        foreach (array_reverse($lines) as $i => $line) {
            if (! preg_match('/^\[([^\]]+)\]\s+[\w-]+\.(\w+):\s(.*?)(?:\s(\{.*\}))?\s*$/', $line, $m)) {
                continue;
            }
            $ctx = isset($m[4]) ? (json_decode($m[4], true) ?: []) : [];
            $type = $ctx['type'] ?? 'other';
            if (! isset(self::TYPES[$type])) {
                $type = 'other';
            }

            $out[] = [
                'id' => $i + 1,
                'datetime' => $m[1],
                'level' => strtolower($m[2]),
                'message' => $m[3],
                'type' => $type,
                'type_label' => self::TYPES[$type],
                'severity' => $ctx['severity'] ?? self::severityFromLevel($m[2]),
                'ip' => $ctx['ip'] ?? null,
                'method' => $ctx['method'] ?? null,
                'url' => $ctx['url'] ?? null,
                'user_id' => $ctx['user_id'] ?? null,
                'username' => $ctx['username'] ?? null,
                'role' => $ctx['role'] ?? null,
                'user_agent' => $ctx['user_agent'] ?? null,
                'details' => $ctx['details'] ?? null,
            ];
        }

        return $out;
    }

    private static function severityFromLevel(string $level): string
    {
        return match (strtolower($level)) {
            'debug', 'info', 'notice' => 'low',
            'warning' => 'medium',
            default => 'high',
        };
    }

    private static function tail(string $path, int $count): array
    {
        $file = new \SplFileObject($path, 'r');
        $file->seek(PHP_INT_MAX);
        $last = $file->key();
        $lines = [];
        for ($n = max(0, $last - $count); $n <= $last; $n++) {
            $file->seek($n);
            $line = rtrim((string) $file->current(), "\r\n");
            if ($line !== '') {
                $lines[] = $line;
            }
        }

        return $lines;
    }

    // Kept narrow: rich-text fields legitimately send <p>, <b>, <a href>.
    public static function detectPayload(string $value): ?string
    {
        $v = urldecode($value);

        if (preg_match('/<\s*script\b|javascript\s*:|<[^>]+\son(error|load|click|mouseover|focus)\s*=|<\s*iframe\b|document\.cookie/i', $v)) {
            return 'xss';
        }
        if (preg_match("/\\bunion\\b\\s+(all\\s+)?\\bselect\\b|'\\s*or\\s+'?\\d+'?\\s*=\\s*'?\\d+|'\\s*or\\s+'[^']*'\\s*=\\s*'|;\\s*(drop|truncate|delete|alter)\\s+(table|from|database)\\b|\\bsleep\\s*\\(\\s*\\d+\\s*\\)|\\bbenchmark\\s*\\(|\\binformation_schema\\b|'\\s*--\\s*$/i", $v)) {
            return 'sql_injection';
        }
        if (preg_match('#(\.\./|\.\.\\\\){2,}|/etc/passwd|c:\\\\windows\\\\win\.ini|php://(input|filter)#i', $v)) {
            return 'path_traversal';
        }

        return null;
    }
}
