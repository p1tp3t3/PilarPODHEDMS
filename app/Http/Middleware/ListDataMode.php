<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * On a list page's API route (the 'list-data' middleware in routes/api.php): the
 * page's controller action answers with the page's lists as JSON
 * (list_page()) instead of the page.
 */
class ListDataMode
{
    public function handle(Request $request, Closure $next): Response
    {
        $request->attributes->set('list_data', true);

        return $next($request);
    }
}
