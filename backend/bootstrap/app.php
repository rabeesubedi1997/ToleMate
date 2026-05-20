<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__ . '/../routes/web.php',
        api: __DIR__ . '/../routes/api.php',
        commands: __DIR__ . '/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Pure API app — never redirect guests to a login route; return null so
        // the Authenticate middleware throws AuthenticationException (caught below)
        $middleware->redirectGuestsTo(fn() => null);

        $middleware->api(prepend: [
            // Remove Sanctum stateful middleware to avoid CSRF issues
        ]);

        $middleware->alias([
            'verified' => \App\Http\Middleware\EnsureEmailIsVerified::class,
            'auth.api' => \App\Http\Middleware\ApiTokenAuth::class,
            'auth.token_query' => \App\Http\Middleware\TokenFromQueryString::class,
        ]);

        $middleware->group('api', [
            \Illuminate\Http\Middleware\HandleCors::class,
        ]);

        // Apply CSRF only to web routes
        $middleware->group('web', [
            \Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Always return JSON 401 for unauthenticated requests (pure API app)
        $exceptions->render(function (\Illuminate\Auth\AuthenticationException $e, \Illuminate\Http\Request $request) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        });
    })->create();
