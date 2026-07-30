<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;

class Vendor extends Model
{
    use SoftDeletes;
    /** All features that can be enabled/disabled per vendor */
    public const ALL_FEATURES = ['bookings', 'messaging', 'services', 'availability_edit', 'social_links', 'reviews', 'whatsapp'];

    /** Per-plan limits */
    public const PLAN_LIMITS = [
        'free' => ['max_services' => 3, 'max_images_per_service' => 3, 'max_bundles' => 0, 'max_portfolio_items' => 5],
        'basic' => ['max_services' => 10, 'max_images_per_service' => 6, 'max_bundles' => 3, 'max_portfolio_items' => 15],
        'pro' => ['max_services' => 50, 'max_images_per_service' => 10, 'max_bundles' => 10, 'max_portfolio_items' => 50],
    ];

    protected $fillable = [
        'user_id',
        'business_name',
        'description',
        'rating',
        'service_area_radius',
        'service_radius_km',
        'is_verified',
        'kyc_status',
        'is_featured',
        'subscription_plan',
        'website',
        'instagram',
        'facebook',
        'whatsapp_number',
        'avatar',
    ];

    protected $casts = [
        'rating' => 'decimal:2',
        'service_area_radius' => 'integer',
        'service_radius_km' => 'integer',
        'is_verified' => 'boolean',
        'is_featured' => 'boolean',
    ];

    protected $appends = ['available_today', 'whatsapp_enabled'];

    public function getAvailableTodayAttribute(): bool
    {
        $today = (int) now()->dayOfWeek; // 0=Sun … 6=Sat
        $row = $this->hasMany(VendorAvailability::class)->where('day_of_week', $today)->first();
        return $row ? (bool) $row->is_available : ($today >= 1 && $today <= 5);
    }

    public function getWhatsappEnabledAttribute(): bool
    {
        return $this->hasFeature('whatsapp');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function services(): HasMany
    {
        return $this->hasMany(Service::class);
    }

    public function vendorFeatures(): HasMany
    {
        return $this->hasMany(VendorFeature::class);
    }

    public function bundles(): HasMany
    {
        return $this->hasMany(ServiceBundle::class);
    }

    public function portfolios(): HasMany
    {
        return $this->hasMany(VendorPortfolio::class);
    }

    /**
     * Check if a feature is enabled for this vendor.
     * Defaults to true (all features on) if no DB record exists.
     * Returns false if vendor is soft-deleted.
     */
    public function hasFeature(string $feature): bool
    {
        if ($this->trashed()) return false;
        $row = $this->vendorFeatures()->where('feature', $feature)->first();
        return $row ? $row->is_enabled : true;  // defaults to TRUE
    }

    public function getPlanLimit(string $key): int
    {
        $plan = $this->subscription_plan ?? 'free';
        return self::PLAN_LIMITS[$plan][$key] ?? self::PLAN_LIMITS['free'][$key] ?? 0;
    }

    public function canCreateService(): bool
    {
        $max = $this->getPlanLimit('max_services');
        $current = $this->services()->count();
        return $current < $max;
    }

    public function canCreateBundle(): bool
    {
        $max = $this->getPlanLimit('max_bundles');
        $current = $this->bundles()->count();
        return $current < $max;
    }

    public function canAddPortfolioItem(): bool
    {
        $max = $this->getPlanLimit('max_portfolio_items');
        $current = $this->portfolios()->count();
        return $current < $max;
    }
}
