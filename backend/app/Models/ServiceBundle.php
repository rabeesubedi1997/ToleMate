<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServiceBundle extends Model
{
    protected $fillable = [
        'vendor_id',
        'name',
        'description',
        'service_ids',
        'bundle_price',
        'discount_percent',
        'is_active',
    ];

    protected $casts = [
        'service_ids'      => 'array',
        'bundle_price'     => 'decimal:2',
        'discount_percent' => 'integer',
        'is_active'        => 'boolean',
    ];

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }
}
