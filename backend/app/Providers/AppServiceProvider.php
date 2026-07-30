<?php

namespace App\Providers;

use App\Models\Service;
use App\Models\Vendor;
use App\Policies\ServicePolicy;
use App\Policies\VendorPolicy;
use Illuminate\Support\ServiceProvider;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)
                ->by($request->user()?->id ?: $request->ip());
        });

        RateLimiter::for('auth', function (Request $request) {
            return Limit::perMinute(5)
                ->by($request->ip());
        });

        // Register policies
        Gate::policy(Vendor::class, VendorPolicy::class);
        Gate::policy(Service::class, ServicePolicy::class);

        // Super admin bypasses all authorization checks
        Gate::before(function ($user) {
            if ($user->role === 'super_admin') {
                return true;
            }
        });
    }
}
