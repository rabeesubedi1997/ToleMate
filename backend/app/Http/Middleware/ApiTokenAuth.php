<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ApiTokenAuth
{
    public function handle(Request $request, Closure $next)
    {
        // Get the token from the request
        $token = $request->bearerToken();
        
        if ($token) {
            try {
                // Validate the token using Sanctum's token guard
                $user = Auth::guard('sanctum')->user();
                
                if ($user) {
                    // Set the authenticated user
                    Auth::setUser($user);
                    return $next($request);
                }
            } catch (\Exception $e) {
                // Token is invalid
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
        }
        
        // For login and register endpoints, allow through without authentication
        if ($request->is('api/login') || $request->is('api/register')) {
            return $next($request);
        }
        
        // For all other API endpoints, require authentication
        return response()->json(['message' => 'Unauthenticated'], 401);
    }
}
