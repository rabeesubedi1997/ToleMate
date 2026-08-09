<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use App\Models\Booking;

class KhaltiPaymentController extends Controller
{
    public function verify(Request $request)
    {
        $request->validate([
            'booking_id' => 'required|exists:bookings,id',
            'khalti_idx' => 'required|string',
            'amount'     => 'required|numeric|min:1',
        ]);

        $user = $request->user();
        $booking = Booking::findOrFail($request->booking_id);

        if ((int) $booking->customer_id !== (int) $user->id && $user->role === 'customer') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($booking->payment_status === 'paid') {
            return response()->json(['message' => 'Already paid'], 400);
        }

        $secretKey = config('services.khalti.secret_key');
        if (!$secretKey) {
            return response()->json(['message' => 'Khalti not configured'], 500);
        }

        $response = Http::withHeaders([
            'Authorization' => 'Key ' . $secretKey,
        ])->post('https://khalti.com/api/v2/payment/verify/', [
            'idx'   => $request->khalti_idx,
            'amount' => $request->amount,
        ]);

        if (!$response->successful()) {
            $booking->update([
                'payment_status' => 'failed',
                'payment_data'   => ['khalti_error' => $response->body()],
            ]);
            return response()->json([
                'message' => 'Payment verification failed',
                'error'   => $response->json(),
            ], 422);
        }

        $data = $response->json();

        $booking->update([
            'payment_status'  => 'paid',
            'payment_method'  => 'khalti',
            'transaction_id'  => $data['idx'] ?? $request->khalti_idx,
            'khalti_idx'      => $request->khalti_idx,
            'payment_data'    => $data,
        ]);

        \App\Http\Controllers\CommissionController::createForBooking($booking);

        NotificationController::sendNotification(
            $booking->vendor->user_id,
            'payment',
            'Payment Received',
            'Payment of Rs. ' . number_format($booking->price, 2) . ' received for booking #' . $booking->id . ' via Khalti.',
            ['booking_id' => $booking->id]
        );

        return response()->json([
            'message' => 'Payment successful',
            'booking' => $booking->fresh(),
        ]);
    }
}
