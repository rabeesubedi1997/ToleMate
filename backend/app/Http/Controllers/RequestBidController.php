<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\BookingRequest;
use App\Models\RequestBid;
use App\Models\Booking;
use App\Models\Vendor;
use App\Models\Service;

class RequestBidController extends Controller
{
    // ── Vendor: list open requests matching their service categories ───────
    public function incomingRequests(Request $request)
    {
        $user = $request->user();
        $vendor = $user->vendor;
        if (!$vendor) {
            return response()->json(['message' => 'Vendor profile not found'], 404);
        }

        // Get category IDs this vendor offers services in
        $categoryIds = Service::where('vendor_id', $vendor->id)
            ->where('is_active', true)
            ->pluck('category_id')
            ->unique()
            ->filter()
            ->values();

        $query = BookingRequest::with(['customer:id,name', 'category:id,name', 'bids' => function ($q) use ($vendor) {
            $q->where('vendor_id', $vendor->id);
        }])
            ->where('status', 'open')
            ->where(function ($q) use ($categoryIds) {
                // Requests matching vendor's categories, or requests with no category (open to all)
                $q->whereIn('category_id', $categoryIds)
                  ->orWhereNull('category_id');
            })
            ->orderByRaw("FIELD(urgency, 'asap', 'this_week', 'this_month', 'flexible')")
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($query);
    }

    // ── Vendor: place or update a bid on a request ─────────────────────────
    public function placeBid(Request $request, $id)
    {
        $user   = $request->user();
        $vendor = $user->vendor;
        if (!$vendor) {
            return response()->json(['message' => 'Vendor profile not found'], 404);
        }

        $bookingRequest = BookingRequest::find($id);
        if (!$bookingRequest || $bookingRequest->status !== 'open') {
            return response()->json(['message' => 'Request not found or no longer open'], 404);
        }

        $v = Validator::make($request->all(), [
            'offered_price' => 'nullable|numeric|min:0|max:9999999',
            'note'          => 'nullable|string|max:500',
        ]);
        if ($v->fails()) {
            return response()->json(['errors' => $v->errors()], 422);
        }

        $bid = RequestBid::updateOrCreate(
            ['request_id' => $bookingRequest->id, 'vendor_id' => $vendor->id],
            [
                'offered_price' => $request->offered_price ?? $bookingRequest->budget,
                'note'          => $request->note,
                'status'        => 'pending',
                'expires_at'    => now()->addHours(2),
            ]
        );

        // Notify the customer that a new offer arrived
        NotificationController::sendNotification(
            $bookingRequest->customer_id,
            'new_bid',
            'New offer received',
            "{$vendor->business_name} sent you an offer for \"{$bookingRequest->title}\".",
            [
                'request_id'    => $bookingRequest->id,
                'bid_id'        => $bid->id,
                'vendor_name'   => $vendor->business_name,
                'offered_price' => $bid->offered_price,
            ]
        );

        return response()->json(['bid' => $bid->load('vendor:id,business_name,rating,is_verified'), 'message' => 'Bid placed'], 201);
    }

    // ── Customer: list all bids on their request ───────────────────────────
    public function listBids(Request $request, $id)
    {
        $user           = $request->user();
        $bookingRequest = BookingRequest::where('id', $id)
            ->where('customer_id', $user->id)
            ->first();

        if (!$bookingRequest) {
            return response()->json(['message' => 'Request not found'], 404);
        }

        $bids = RequestBid::with([
            'vendor:id,business_name,rating,is_verified,avatar,user_id',
            'vendor.user:id,name',
        ])
            ->where('request_id', $id)
            ->where('status', '!=', 'withdrawn')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->orderBy('offered_price', 'asc')
            ->get()
            ->map(function ($bid) {
                // Count completed bookings for this vendor
                $jobsDone = Booking::where('vendor_id', $bid->vendor_id)
                    ->where('status', 'completed')
                    ->count();
                $bid->jobs_completed = $jobsDone;
                return $bid;
            });

        return response()->json([
            'request' => $bookingRequest->load('category:id,name'),
            'bids'    => $bids,
        ]);
    }

    // ── Customer: accept a bid → creates Booking, closes request ──────────
    public function acceptBid(Request $request, $id, $bidId)
    {
        $user           = $request->user();
        $bookingRequest = BookingRequest::where('id', $id)
            ->where('customer_id', $user->id)
            ->where('status', 'open')
            ->first();

        if (!$bookingRequest) {
            return response()->json(['message' => 'Request not found or already closed'], 404);
        }

        $bid = RequestBid::where('id', $bidId)
            ->where('request_id', $id)
            ->where('status', 'pending')
            ->where(function ($q) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->first();

        if (!$bid) {
            return response()->json(['message' => 'Bid not found or expired'], 404);
        }

        // Find the vendor's primary service in the request's category
        $service = Service::where('vendor_id', $bid->vendor_id)
            ->where('is_active', true)
            ->when($bookingRequest->category_id, fn($q) => $q->where('category_id', $bookingRequest->category_id))
            ->first();

        // If no category-matched service, fall back to any active service from this vendor
        if (!$service) {
            $service = Service::where('vendor_id', $bid->vendor_id)->where('is_active', true)->first();
        }

        if (!$service) {
            return response()->json(['message' => 'Vendor has no active service'], 422);
        }

        // Create the booking
        $booking = Booking::create([
            'customer_id'  => $user->id,
            'vendor_id'    => $bid->vendor_id,
            'service_id'   => $service->id,
            'booking_type' => 'quote',
            'status'       => 'accepted',
            'price'        => $bid->offered_price ?? $bookingRequest->budget,
            'scheduled_time' => $bookingRequest->preferred_date,
            'lat'          => $bookingRequest->lat,
            'lng'          => $bookingRequest->lng,
        ]);

        // Accept this bid
        $bid->update(['status' => 'accepted']);

        // Decline all other pending bids on this request
        RequestBid::where('request_id', $id)
            ->where('id', '!=', $bidId)
            ->where('status', 'pending')
            ->update(['status' => 'declined']);

        // Close the request
        $bookingRequest->update(['status' => 'closed']);

        // Notify the winning vendor
        NotificationController::sendNotification(
            $bid->vendor->user_id,
            'bid_accepted',
            'Your offer was accepted!',
            "{$user->name} accepted your offer for \"{$bookingRequest->title}\".",
            [
                'booking_id'   => $booking->id,
                'request_id'   => $bookingRequest->id,
                'service_name' => $bookingRequest->title,
                'price'        => $bid->offered_price ?? $bookingRequest->budget,
                'customer_name'=> $user->name,
            ]
        );

        // Notify all other vendors their bid was declined
        $declinedBids = RequestBid::with('vendor:id,user_id')
            ->where('request_id', $id)
            ->where('id', '!=', $bidId)
            ->where('status', 'declined')
            ->get();

        foreach ($declinedBids as $db) {
            if ($db->vendor?->user_id) {
                NotificationController::sendNotification(
                    $db->vendor->user_id,
                    'bid_declined',
                    'Offer not selected',
                    "Another vendor was chosen for \"{$bookingRequest->title}\".",
                    [
                        'request_id'   => $bookingRequest->id,
                        'service_name' => $bookingRequest->title,
                    ]
                );
            }
        }

        return response()->json([
            'booking' => $booking->load(['service:id,name', 'vendor:id,business_name', 'customer:id,name']),
            'message' => 'Offer accepted! Booking created.',
        ], 201);
    }

    // ── Customer: decline a specific bid ──────────────────────────────────
    public function declineBid(Request $request, $id, $bidId)
    {
        $user           = $request->user();
        $bookingRequest = BookingRequest::where('id', $id)
            ->where('customer_id', $user->id)
            ->first();

        if (!$bookingRequest) {
            return response()->json(['message' => 'Request not found'], 404);
        }

        $bid = RequestBid::where('id', $bidId)
            ->where('request_id', $id)
            ->where('status', 'pending')
            ->first();

        if (!$bid) {
            return response()->json(['message' => 'Bid not found'], 404);
        }

        $bid->update(['status' => 'declined']);

        return response()->json(['message' => 'Offer declined']);
    }

    // ── Vendor: withdraw their own bid ─────────────────────────────────────
    public function withdrawBid(Request $request, $id)
    {
        $user   = $request->user();
        $vendor = $user->vendor;

        $bid = RequestBid::where('id', $id)
            ->where('vendor_id', $vendor?->id)
            ->where('status', 'pending')
            ->first();

        if (!$bid) {
            return response()->json(['message' => 'Bid not found'], 404);
        }

        $bid->update(['status' => 'withdrawn']);

        return response()->json(['message' => 'Offer withdrawn']);
    }
}
