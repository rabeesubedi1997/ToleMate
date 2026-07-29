<?php

namespace App\Http\Controllers;

use App\Models\Coupon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class CouponController extends Controller
{
    /** POST /api/coupons/apply  — validate a coupon code against an order amount */
    public function apply(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code'   => 'required|string',
            'amount' => 'required|numeric|min:0',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $coupon = Coupon::where('code', strtoupper(trim($request->code)))->first();

        if (!$coupon || !$coupon->isValid()) {
            return response()->json(['message' => 'Invalid or expired coupon code.'], 422);
        }

        if ($request->amount < $coupon->min_order) {
            return response()->json([
                'message' => "Minimum order of Rs. {$coupon->min_order} required for this coupon.",
            ], 422);
        }

        $discount = $coupon->computeDiscount((float) $request->amount);

        $coupon->increment('used_count');

        return response()->json([
            'coupon'    => $coupon,
            'discount'  => $discount,
            'final'     => max(0, $request->amount - $discount),
        ]);
    }

    // ── Admin endpoints ──

    public function index()
    {
        return response()->json(Coupon::orderByDesc('created_at')->get());
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'code'           => 'required|string|max:50|unique:coupons,code',
            'discount_type'  => 'required|in:flat,percent',
            'discount_value' => 'required|numeric|min:0',
            'min_order'      => 'nullable|numeric|min:0',
            'max_discount'   => 'nullable|numeric|min:0',
            'max_uses'       => 'nullable|integer|min:1',
            'expires_at'     => 'nullable|date|after:now',
            'description'    => 'nullable|string|max:500',
            'is_active'      => 'nullable|boolean',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $coupon = Coupon::create([
            'code'           => strtoupper(trim($request->code)),
            'discount_type'  => $request->discount_type,
            'discount_value' => $request->discount_value,
            'min_order'      => $request->min_order ?? 0,
            'max_discount'   => $request->max_discount,
            'max_uses'       => $request->max_uses,
            'expires_at'     => $request->expires_at,
            'description'    => $request->description,
            'is_active'      => $request->is_active ?? true,
        ]);

        return response()->json(['coupon' => $coupon, 'message' => 'Coupon created.'], 201);
    }

    public function update(Request $request, $id)
    {
        $coupon = Coupon::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'code'           => "sometimes|string|max:50|unique:coupons,code,{$id}",
            'discount_type'  => 'sometimes|in:flat,percent',
            'discount_value' => 'sometimes|numeric|min:0',
            'min_order'      => 'nullable|numeric|min:0',
            'max_discount'   => 'nullable|numeric|min:0',
            'max_uses'       => 'nullable|integer|min:1',
            'expires_at'     => 'nullable|date',
            'description'    => 'nullable|string|max:500',
            'is_active'      => 'nullable|boolean',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $data = $request->only(['discount_type', 'discount_value', 'min_order', 'max_discount', 'max_uses', 'expires_at', 'description', 'is_active']);
        if ($request->has('code')) $data['code'] = strtoupper(trim($request->code));
        $coupon->update($data);

        return response()->json(['coupon' => $coupon, 'message' => 'Coupon updated.']);
    }

    public function destroy($id)
    {
        Coupon::findOrFail($id)->delete();
        return response()->json(['message' => 'Coupon deleted.']);
    }
}
