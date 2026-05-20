<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Booking extends Model
{
    // Note: vendor_id stores the vendors.id (vendor profile ID), not users.id
    protected $fillable = [
        'customer_id',
        'vendor_id',
        'service_id',
        'booking_type',
        'status',
        'price',
        'scheduled_time',
        'lat',
        'lng',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'scheduled_time' => 'datetime',
        'lat' => 'decimal:8',
        'lng' => 'decimal:8',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class, 'vendor_id');
    }

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    public function messages(): HasMany
    {
        return $this->hasMany(Message::class);
    }

    public function review(): HasOne
    {
        return $this->hasOne(Review::class);
    }
}
