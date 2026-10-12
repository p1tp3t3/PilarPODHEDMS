<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * User searches hand out encrypted ids only (see UserSearchResource), so
 * forms post those tokens back. Any request field holding a valid
 * encrypt_id() token is swapped for the plain id here, before validation
 * and controllers see it — so every endpoint keeps working with integers.
 * Anything that isn't a valid token (text, passwords, plain numbers) is
 * left as-is; a forged token fails the MAC check and stays a string.
 */
class DecryptEncryptedIds
{
    public function handle(Request $request, Closure $next): Response
    {
        // Query string too: some reports send the picked user as ?user_id=.
        $request->query->replace(self::decryptAll($request->query->all()));

        if (! $request->isMethodSafe()) {
            $body = $request->isJson() ? $request->json()->all() : $request->request->all();
            $request->merge(self::decryptAll($body));
        }

        return $next($request);
    }

    private static function decryptAll(array $input): array
    {
        foreach ($input as $key => $value) {
            if (is_array($value)) {
                $input[$key] = self::decryptAll($value);
            } elseif (self::looksLikeToken($value)) {
                $input[$key] = decrypt_id($value) ?? $value;
            }
        }

        return $input;
    }

    // encrypt_id() output: base64url of Laravel's {"iv","value","mac"} JSON.
    private static function looksLikeToken($value): bool
    {
        return is_string($value)
            && strlen($value) > 100
            && str_starts_with($value, 'eyJpdiI6')
            && preg_match('/^[A-Za-z0-9_=-]+$/', $value) === 1;
    }
}
