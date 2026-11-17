<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Browser security headers on every page and JSON response.
 *  - X-Frame-Options: other sites can't put the app in a frame (clickjacking);
 *    SAMEORIGIN keeps the System Maintenance live preview and PDF frames working.
 *  - X-Content-Type-Options: files are never run as a type they weren't sent as.
 *  - Referrer-Policy: other sites get only the domain, never a page's path or query.
 *  - Strict-Transport-Security: once served over HTTPS, browsers stay on HTTPS.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $headers = $response->headers;
        $headers->set('X-Frame-Options', 'SAMEORIGIN', false);
        $headers->set('X-Content-Type-Options', 'nosniff', false);
        $headers->set('Referrer-Policy', 'strict-origin-when-cross-origin', false);

        if ($request->isSecure() && app()->isProduction()) {
            $headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains', false);
        }

        return $response;
    }
}
