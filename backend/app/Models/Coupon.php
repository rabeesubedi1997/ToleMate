<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Coupon extends Model
{
    protected $fillable = [
        'code',
        'discount_type',
        'discount_value',
        'min_order',
        'max_discount',
        'max_uses',
        'used_count',
        'expires_at',
        'is_active',
        'description',
    ];

    protected $casts = [
        'discount_value' => 'float',
        'min_order' => 'float',
        'max_discount' => 'float',
        'is_active' => 'boolean',
        'expires_at' => 'datetime',
    ];

    public function isValid(): bool
    {
        if (!$this->is_active) return false;
        if ($this->expires_at && $this->expires_at->isPast()) return false;
        if ($this->max_uses !== null && $this->used_count >= $this->max_uses) return false;
        return true;
    }

    public function computeDiscount(float $amount): float
    {
        if ($amount < $this->min_order) return 0;
        if ($this->discount_type === 'flat') {
            return min($this->discount_value, $amount);
        }
        $discount = $amount * ($this->discount_value / 100);
        if ($this->max_discount) {
            $discount = min($discount, $this->max_discount);
        }
        return round($discount, 2);
    }
}
