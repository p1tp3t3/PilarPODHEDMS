<?php

namespace App\Http\Middleware;

use App\Support\BreachLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Logs (doesn't block) requests carrying SQL injection, XSS or path traversal payloads. */
class DetectMaliciousInput
{
    private const SKIP = ['password', 'password_confirmation', 'confirm_password', 'current_password', 'new_password', '_token'];

    public function handle(Request $request, Closure $next): Response
    {
        $hits = [];

        $path = rawurldecode($request->getPathInfo());
        if ($type = BreachLog::detectPayload($path)) {
            $hits[$type][] = ['field' => '(url)', 'value' => $path];
        }

        $input = $request->query->all();
        if (! $request->isMethodSafe()) {
            $input = array_merge($input, $request->isJson() ? $request->json()->all() : $request->request->all());
        }
        $this->scan($input, '', $hits);

        foreach ($hits as $type => $fields) {
            BreachLog::record(
                $type,
                'high',
                BreachLog::TYPES[$type].' payload in '.implode(', ', array_unique(array_column($fields, 'field'))),
                ['fields' => array_slice($fields, 0, 5)]
            );
        }

        return $next($request);
    }

    private function scan(array $input, string $prefix, array &$hits): void
    {
        foreach ($input as $key => $value) {
            if (in_array(strtolower((string) $key), self::SKIP, true)) {
                continue;
            }
            $name = $prefix === '' ? (string) $key : "{$prefix}.{$key}";
            if (is_array($value)) {
                $this->scan($value, $name, $hits);
            } elseif (is_string($value) && $value !== '' && ($type = BreachLog::detectPayload($value))) {
                $hits[$type][] = ['field' => $name, 'value' => mb_substr($value, 0, 200)];
            }
        }
    }
}
