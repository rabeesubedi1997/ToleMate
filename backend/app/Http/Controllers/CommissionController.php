<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Commission;
use App\Models\Booking;

class CommissionController extends Controller
{
    private function getDefaultRate(): float
    {
        $setting = \App\Models\Setting::where('key', 'commission_rate')->first();
        return $setting ? (float) $setting->value : 10.0;
    }

    public static function createForBooking(Booking $booking): ?Commission
    {
        if ($booking->payment_status !== 'paid') return null;

        $rate = (new self)->getDefaultRate();
        $amount = $booking->price ?? 0;
        $commissionAmount = round($amount * $rate / 100, 2);

        return Commission::create([
            'booking_id'        => $booking->id,
            'vendor_id'         => $booking->vendor_id,
            'service_id'        => $booking->service_id,
            'amount'            => $amount,
            'commission_rate'   => $rate,
            'commission_amount' => $commissionAmount,
            'status'            => 'pending',
        ]);
    }

    public function index(Request $request)
    {
        $query = Commission::with(['booking.service', 'vendor']);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        if ($request->vendor_id) {
            $query->where('vendor_id', $request->vendor_id);
        }

        return response()->json($query->orderBy('created_at', 'desc')->paginate(20));
    }

    public function stats()
    {
        return response()->json([
            'total_commission'     => Commission::where('status', '!=', 'refunded')->sum('commission_amount'),
            'pending_commission'   => Commission::where('status', 'pending')->sum('commission_amount'),
            'paid_commission'      => Commission::where('status', 'paid')->sum('commission_amount'),
            'total_orders'         => Commission::count(),
            'default_rate'         => $this->getDefaultRate(),
        ]);
    }

    public function markAsPaid(Request $request, $id)
    {
        $commission = Commission::find($id);
        if (!$commission) return response()->json(['message' => 'Commission not found'], 404);

        $commission->update([
            'status'  => 'paid',
            'paid_at' => now(),
        ]);

        return response()->json(['message' => 'Commission marked as paid', 'commission' => $commission]);
    }

    public function updateRate(Request $request)
    {
        $request->validate(['rate' => 'required|numeric|min:0|max:100']);

        \App\Models\Setting::updateOrCreate(
            ['key' => 'commission_rate'],
            ['value' => (string) $request->rate]
        );

        return response()->json(['message' => 'Commission rate updated', 'rate' => $request->rate]);
    }
}
