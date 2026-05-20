<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RequestBid extends Model
{
    protected $fillable = [
        'request_id',
        'vendor_id',
        'offered_price',
        'note',
        'status',
        'expires_at',
    ];

    protected $casts = [
        'offered_price' => 'decimal:2',
        'expires_at'    => 'datetime',
    ];

    public function request(): BelongsTo
    {
        return $this->belongsTo(BookingRequest::class, 'request_id');
    }

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }
}
