<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VendorFeature extends Model
{
    protected $table = 'vendor_features';

    protected $fillable = ['vendor_id', 'feature', 'is_enabled'];

    protected $casts = ['is_enabled' => 'boolean'];

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }
}
