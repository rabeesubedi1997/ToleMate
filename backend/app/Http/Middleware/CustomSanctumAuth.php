<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\AuthenticateSession;
use Laravel\Sanctum\Sanctum;
use Illuminate\Auth\AuthenticationException;

class CustomSanctumAuth
{
    public function handle(Request $request, Closure $next)
    {
        // Check for token in Authorization header
        $token = $request->bearerToken();
        
        if ($token) {
            try {
                // Authenticate using Sanctum's token guard
                $user = Sanctum::$app['auth']->guard('sanctum')->user();
                
                if ($user) {
                    // Set the authenticated user
                    Sanctum::$app['auth']->setUser($user);
                    return $next($request);
                }
            } catch (\Exception $e) {
                // Token is invalid
                return response()->json(['message' => 'Unauthenticated'], 401);
            }
        }
        
        // For login/register endpoints, allow through
        if ($request->is('api/login') || $request->is('api/register')) {
            return $next($request);
        }
        
        // For other API endpoints, require authentication
        return response()->json(['message' => 'Unauthenticated'], 401);
    }
}
