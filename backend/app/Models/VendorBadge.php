<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VendorBadge extends Model
{
    protected $fillable = [
        'vendor_id',
        'top_rated',
        'fast_responder',
        'verified_pro',
        'popular',
        'new_vendor',
    ];

    protected $casts = [
        'top_rated'      => 'boolean',
        'fast_responder' => 'boolean',
        'verified_pro'   => 'boolean',
        'popular'        => 'boolean',
        'new_vendor'     => 'boolean',
    ];

    public function vendor(): BelongsTo
    {
        return $this->belongsTo(Vendor::class);
    }

    /** Returns an array of earned badge names */
    public function earned(): array
    {
        $labels = [
            'top_rated'      => '⭐ Top Rated',
            'fast_responder' => '⚡ Fast Responder',
            'verified_pro'   => '✓ Verified Pro',
            'popular'        => '🔥 Popular',
            'new_vendor'     => '🆕 New',
        ];
        return array_values(array_filter(
            array_map(fn($k, $v) => $this->$k ? $v : null, array_keys($labels), $labels)
        ));
    }
}
