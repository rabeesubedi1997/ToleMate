<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class TokenFromQueryString
{
    public function handle(Request $request, Closure $next)
    {
        // Allow token as query param for EventSource (can't set Authorization headers)
        if ($request->query('token') && !$request->bearerToken()) {
            $request->headers->set('Authorization', 'Bearer ' . $request->query('token'));
        }
        return $next($request);
    }
}
