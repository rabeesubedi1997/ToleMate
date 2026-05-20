<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class LoyaltyController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Recent completed bookings showing points earned
        $completedBookings = \App\Models\Booking::with('service:id,name,price')
            ->where('customer_id', $user->id)
            ->where('status', 'completed')
            ->orderByDesc('updated_at')
            ->take(20)
            ->get()
            ->map(function ($b) {
                $price = $b->price ?? $b->service?->price ?? 0;
                return [
                    'id' => $b->id,
                    'service_name' => $b->service?->name ?? 'Service',
                    'completed_at' => $b->updated_at,
                    'points_earned' => max(1, (int) floor($price / 10)),
                ];
            });

        return response()->json([
            'balance' => $user->loyalty_points ?? 0,
            'history' => $completedBookings,
        ]);
    }
}
