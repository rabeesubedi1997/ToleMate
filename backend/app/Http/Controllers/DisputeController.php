<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Dispute;
use App\Models\Booking;

class DisputeController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Dispute::with(['booking.service', 'raiser', 'resolver']);

        if (!in_array($user->role, ['admin', 'super_admin'])) {
            $query->where('raised_by', $user->id);
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        return response()->json($query->orderByDesc('created_at')->paginate(20));
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role, ['customer', 'vendor'])) {
            return response()->json(['message' => 'Only customers and vendors can raise disputes'], 403);
        }

        $validator = Validator::make($request->all(), [
            'booking_id'  => 'required|exists:bookings,id',
            'reason'      => 'required|string|max:255',
            'description' => 'required|string|max:2000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $booking = Booking::find($request->booking_id);

        // Verify user is party to this booking
        $isCustomer = $user->role === 'customer' && $booking->customer_id === $user->id;
        $isVendor = $user->role === 'vendor' && $booking->vendor_id === $user->vendor?->id;

        if (!$isCustomer && !$isVendor && !in_array($user->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'You are not a party to this booking'], 403);
        }

        // Check existing open dispute
        $existing = Dispute::where('booking_id', $booking->id)
            ->whereIn('status', ['open', 'under_review'])
            ->first();

        if ($existing) {
            return response()->json(['message' => 'An active dispute already exists for this booking'], 400);
        }

        $dispute = Dispute::create([
            'booking_id'  => $booking->id,
            'raised_by'   => $user->id,
            'role'        => $user->role,
            'reason'      => $request->reason,
            'description' => $request->description,
            'status'      => 'open',
        ]);

        // Notify admins
        $admins = \App\Models\User::whereIn('role', ['admin', 'super_admin'])->get();
        foreach ($admins as $admin) {
            NotificationController::sendNotification(
                $admin->id,
                'system',
                'New Dispute',
                "A dispute has been raised for booking #{$booking->id} by {$user->name}.",
                ['booking_id' => $booking->id, 'dispute_id' => $dispute->id]
            );
        }

        return response()->json(['dispute' => $dispute->load(['booking.service', 'raiser']), 'message' => 'Dispute raised'], 201);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user();
        $dispute = Dispute::with(['booking.service', 'raiser', 'resolver'])->find($id);

        if (!$dispute) return response()->json(['message' => 'Dispute not found'], 404);

        if (!in_array($user->role, ['admin', 'super_admin']) && $dispute->raised_by !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json($dispute);
    }

    public function resolve(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Only admins can resolve disputes'], 403);
        }

        $validator = Validator::make($request->all(), [
            'resolution' => 'required|string|max:2000',
            'status'     => 'required|in:resolved,rejected',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $dispute = Dispute::with('booking')->find($id);
        if (!$dispute) return response()->json(['message' => 'Dispute not found'], 404);

        $dispute->update([
            'status'       => $request->status,
            'resolution'   => $request->resolution,
            'resolved_by'  => $user->id,
            'resolved_at'  => now(),
        ]);

        // Notify raiser
        NotificationController::sendNotification(
            $dispute->raised_by,
            'system',
            'Dispute Resolved',
            "Your dispute for booking #{$dispute->booking_id} has been {$request->status}. Resolution: {$request->resolution}",
            ['booking_id' => $dispute->booking_id, 'dispute_id' => $dispute->id]
        );

        return response()->json(['dispute' => $dispute->fresh()->load(['booking.service', 'raiser', 'resolver']), 'message' => 'Dispute resolved']);
    }
}
