<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Review;
use App\Models\Booking;
use App\Models\Vendor;

class ReviewController extends Controller
{
    public function index($vendor_id)
    {
        $reviews = Review::with(['customer:id,name'])
            ->where('vendor_id', $vendor_id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($reviews);
    }

    public function myReviews(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'customer') {
            return response()->json(['message' => 'Only customers can view their reviews'], 403);
        }

        $reviews = Review::with(['vendor:id,business_name,user_id', 'booking.service:id,name'])
            ->where('customer_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($reviews);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'customer') {
            return response()->json(['message' => 'Only customers can leave a review'], 403);
        }

        $validator = Validator::make($request->all(), [
            'booking_id' => 'required|exists:bookings,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $booking = Booking::find($request->booking_id);

        if ($booking->customer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized. This is not your booking.'], 403);
        }

        if ($booking->status !== 'completed') {
            return response()->json(['message' => 'Reviews can only be left for completed bookings.'], 400);
        }

        // Check if review already exists
        $existingReview = Review::where('booking_id', $booking->id)->first();
        if ($existingReview) {
            return response()->json(['message' => 'You have already reviewed this booking.'], 400);
        }

        $review = Review::create([
            'booking_id' => $booking->id,
            'customer_id' => $user->id,
            'vendor_id' => $booking->vendor_id,
            'rating' => $request->rating,
            'comment' => $request->comment,
        ]);

        // Update vendor's cached average rating
        $vendor = Vendor::find($booking->vendor_id);
        if ($vendor) {
            $averageRating = Review::where('vendor_id', $vendor->id)->avg('rating');
            $vendor->rating = round($averageRating, 1);
            $vendor->save();
        }

        return response()->json([
            'review' => $review->load(['customer:id,name']),
            'message' => 'Review submitted successfully'
        ], 201);
    }

    public function vendorReply(Request $request, $id)
    {
        $user = $request->user();

        if ($user->role !== 'vendor') {
            return response()->json(['message' => 'Only vendors can reply to reviews'], 403);
        }

        $vendor = $user->vendor;
        if (!$vendor) {
            return response()->json(['message' => 'Vendor profile not found'], 404);
        }

        $review = Review::find($id);
        if (!$review) {
            return response()->json(['message' => 'Review not found'], 404);
        }

        if ($review->vendor_id !== $vendor->id) {
            return response()->json(['message' => 'Unauthorized — not your review'], 403);
        }

        $validator = Validator::make($request->all(), [
            'vendor_reply' => 'required|string|max:1000',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $review->update([
            'vendor_reply' => $request->vendor_reply,
            'vendor_replied_at' => now(),
        ]);

        return response()->json(['review' => $review, 'message' => 'Reply posted']);
    }
}
