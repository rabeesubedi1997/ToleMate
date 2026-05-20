<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Booking;
use Illuminate\Support\Facades\Validator;
use App\Http\Controllers\NotificationController;

class PaymentController extends Controller
{
    public function processMockPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'booking_id' => 'required|exists:bookings,id',
            'payment_method' => 'required|string',
            'card_last_four' => 'required|string|size:4',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $booking = Booking::with(['service.vendor'])->find($request->booking_id);

        if ($booking->customer_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($booking->payment_status === 'paid') {
            return response()->json(['message' => 'Booking already paid'], 400);
        }

        // Mock success
        $booking->update([
            'payment_status' => 'paid',
            'payment_method' => $request->payment_method,
            'transaction_id' => 'TXN_' . uniqid(),
        ]);

        // Notify Vendor
        NotificationController::sendNotification(
            $booking->service->vendor->user_id,
            'payment',
            'Payment Received',
            "Payment of ${$booking->price} received for booking #{$booking->id}.",
            ['booking_id' => $booking->id]
        );

        return response()->json([
            'message' => 'Payment successful',
            'booking' => $booking
        ]);
    }
}
