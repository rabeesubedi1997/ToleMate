<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Booking;
use Illuminate\Support\Facades\Validator;
use App\Http\Controllers\NotificationController;

class PaymentController extends Controller
{
    /**
     * Customer payment — supports cash/cod (mark pending), esewa, khalti, card (mark paid instantly).
     * POST /api/payments/mock
     */
    public function processMockPayment(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'booking_id'     => 'required|exists:bookings,id',
            'payment_method' => 'required|in:cod,esewa,khalti,card',
            'card_last_four' => 'nullable|string|size:4',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user    = $request->user();
        $booking = Booking::with(['service.vendor'])->find($request->booking_id);

        if ($booking->customer_id !== $user->id && $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($booking->payment_status === 'paid') {
            return response()->json(['message' => 'Booking already paid'], 400);
        }

        $method = $request->payment_method;

        // COD: payment confirmed later when vendor collects cash
        if ($method === 'cod') {
            $booking->update([
                'payment_method' => 'cod',
                // status stays 'pending' until vendor marks cash received
            ]);
            return response()->json([
                'message' => 'COD selected. Pay the vendor in cash when they arrive.',
                'booking' => $booking->fresh(),
            ]);
        }

        // Digital payments (eSewa, Khalti, Card) — mock instant success
        $booking->update([
            'payment_status'  => 'paid',
            'payment_method'  => $method,
            'transaction_id'  => strtoupper($method) . '_' . uniqid(),
        ]);

        NotificationController::sendNotification(
            $booking->service->vendor->user_id,
            'payment',
            'Payment received',
            "Rs. {$booking->price} received via " . strtoupper($method) . " for booking #{$booking->id}.",
            ['booking_id' => $booking->id, 'payment_method' => $method]
        );

        return response()->json([
            'message' => 'Payment successful',
            'booking' => $booking->fresh(),
        ]);
    }

    /**
     * Vendor marks cash as received.
     * POST /api/bookings/{id}/mark-cash-paid
     */
    public function markCashPaid(Request $request, $id)
    {
        $user    = $request->user();
        $booking = Booking::with(['service.vendor', 'customer'])->find($id);

        if (!$booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        // Only the vendor who owns this booking
        if ($user->role !== 'vendor' || $booking->vendor_id !== $user->vendor?->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($booking->payment_status === 'paid') {
            return response()->json(['message' => 'Already marked as paid'], 400);
        }

        $booking->update([
            'payment_status' => 'paid',
            'payment_method' => 'cash',
            'transaction_id' => 'CASH_' . uniqid(),
        ]);

        // Notify customer
        if ($booking->customer) {
            NotificationController::sendNotification(
                $booking->customer_id,
                'payment',
                'Cash payment confirmed',
                "Your vendor confirmed cash payment for \"{$booking->service->name}\".",
                ['booking_id' => $booking->id, 'payment_method' => 'cash']
            );
        }

        return response()->json([
            'message' => 'Cash payment marked as received',
            'booking' => $booking->fresh(),
        ]);
    }
}
