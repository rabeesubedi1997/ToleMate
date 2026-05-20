<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Vendor extends Model
{
    /** All features that can be enabled/disabled per vendor */
    public const ALL_FEATURES = ['bookings', 'messaging', 'services', 'availability_edit', 'social_links', 'reviews'];

    protected $fillable = [
        'user_id',
        'business_name',
        'description',
        'rating',
        'service_area_radius',
        'service_radius_km',
        'is_verified',
        'is_featured',
        'subscription_plan',
        'website',
        'instagram',
        'facebook',
        'avatar',
    ];

    protected $casts = [
        'rating' => 'decimal:2',
        'service_area_radius' => 'integer',
        'service_radius_km' => 'integer',
        'is_verified' => 'boolean',
        'is_featured' => 'boolean',
    ];

    protected $appends = ['available_today'];

    public function getAvailableTodayAttribute(): bool
    {
        $today = (int) now()->dayOfWeek; // 0=Sun … 6=Sat
        $row = $this->hasMany(VendorAvailability::class)->where('day_of_week', $today)->first();
        return $row ? (bool) $row->is_available : ($today >= 1 && $today <= 5);
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

    /**
     * Check if a feature is enabled for this vendor.
     * Defaults to true (all features on) if no DB record exists.
     */
    public function hasFeature(string $feature): bool
    {
        $row = $this->vendorFeatures()->where('feature', $feature)->first();
        return $row ? $row->is_enabled : true;
    }
}
