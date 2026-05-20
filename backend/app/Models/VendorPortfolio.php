<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VendorPortfolio extends Model
{
    protected $table = 'vendor_portfolio';

    protected $fillable = [
        'vendor_id',
        'image_url',
        'before_image_url',
        'caption',
        'sort_order',
    ];

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }
}
