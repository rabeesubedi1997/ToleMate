<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BookingRequest extends Model
{
    protected $fillable = [
        'customer_id',
        'title',
        'text',
        'category_id',
        'budget',
        'preferred_date',
        'urgency',
        'lat',
        'lng',
        'status',
        'closed_at',
    ];

    protected $casts = [
        'lat' => 'decimal:8',
        'lng' => 'decimal:8',
        'budget' => 'decimal:2',
        'preferred_date' => 'datetime',
        'closed_at' => 'datetime',
    ];

    public function customer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    /** Competing vendor quotes submitted against this request. */
    public function quotes(): HasMany
    {
        return $this->hasMany(Booking::class, 'booking_request_id');
    }
}
