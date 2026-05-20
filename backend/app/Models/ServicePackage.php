<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServicePackage extends Model
{
    protected $fillable = [
        'service_id',
        'name',
        'description',
        'price',
        'delivery_days',
        'features',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'delivery_days' => 'integer',
        'features' => 'array',
        'sort_order' => 'integer',
        'is_active' => 'boolean',
    ];

    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }
}
