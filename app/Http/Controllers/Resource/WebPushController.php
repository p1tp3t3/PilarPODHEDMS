<?php

namespace App\Http\Controllers\Resource;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class WebPushController extends Controller
{
    public function store(Request $request)
    {
        if (auth()->check()) {
            auth()->user()->updatePushSubscription(
                $request->endpoint,
                $request->public_key,
                $request->auth
            );
        }
        session(['webpush_endpoint' => $request->endpoint]);

        return response()->json(['status' => 'subscription saved']);
    }
}
