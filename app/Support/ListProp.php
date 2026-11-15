<?php

namespace App\Support;

use Closure;

/**
 * A page prop that is a list/table: left out of the page response and
 * served instead by the page's API endpoint (GET /api/<page path>, in
 * routes/api.php), which the page calls once it opens. See list_prop() /
 * list_page() in helpers.php.
 */
class ListProp
{
    public function __construct(public Closure $resolve) {}
}
