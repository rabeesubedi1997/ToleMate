<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Service extends Model
{
    protected $fillable = [
        'vendor_id',
        'category_id',
        'name',
        'description',
        'price',
        'sale_price',
        'sale_ends_at',
        'pricing_type',
        'tags',
        'is_active',
        'radius',
        'cancellation_policy',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'sale_ends_at' => 'datetime',
        'tags' => 'array',
        'is_active' => 'boolean',
        'radius' => 'integer',
    ];

    /** Returns sale_price if sale is currently active, otherwise price */
    public function getEffectivePriceAttribute(): ?float
    {
        if ($this->sale_price && (!$this->sale_ends_at || $this->sale_ends_at->isFuture())) {
            return (float) $this->sale_price;
        }
        return $this->price ? (float) $this->price : null;
    }

    public function getOnSaleAttribute(): bool
    {
        return $this->sale_price !== null && (!$this->sale_ends_at || $this->sale_ends_at->isFuture());
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ServiceImage::class);
    }

    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    public function packages(): HasMany
    {
        return $this->hasMany(ServicePackage::class)->where('is_active', true)->orderBy('sort_order')->orderBy('price');
    }
}
