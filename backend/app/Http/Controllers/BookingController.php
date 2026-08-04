<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Mail;
use App\Models\Booking;
use App\Models\BookingRequest;
use App\Models\Service;
use App\Models\ServicePackage;
use App\Models\User;
use App\Models\Vendor;
use App\Mail\BookingMail;

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Booking::with(['service.category', 'vendor', 'customer', 'review', 'package']);

        if ($user->role !== 'admin') {
            if ($user->role === 'customer') {
                $query->where('customer_id', $user->id);
            } elseif ($user->role === 'vendor') {
                $vendorId = $user->vendor?->id;
                if ($vendorId) {
                    $query->where('vendor_id', $vendorId);
                } else {
                    $query->whereRaw('1 = 0');
                }
            }
        }

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $bookings = $query->orderBy('created_at', 'desc')->paginate(10);

        return response()->json($bookings);
    }

    public function show($id)
    {
        $user = request()->user();
        $query = Booking::with(['service.category', 'service.vendor', 'customer', 'messages', 'package'])
            ->where('id', $id);

        if ($user->role !== 'admin') {
            $vendorId = $user->vendor?->id;
            $query->where(function ($q) use ($user, $vendorId) {
                $q->where('customer_id', $user->id);
                if ($vendorId) {
                    $q->orWhere('vendor_id', $vendorId);
                }
            });
        }

        $booking = $query->first();

        if (!$booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        return response()->json($booking);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        // All authenticated users can create bookings (customers, vendors, and admins)
        if (!$user) {
            return response()->json(['message' => 'Authentication required'], 401);
        }

        $validator = Validator::make($request->all(), [
            'service_id'     => 'required|exists:services,id',
            'package_id'     => 'nullable|exists:service_packages,id',
            'booking_type'   => 'required|in:instant,quote',
            'price'          => 'nullable|numeric|min:0',
            'scheduled_time' => 'nullable|date|after:now',
            'lat'            => 'nullable|numeric|between:-90,90',
            'lng'            => 'nullable|numeric|between:-180,180',
            'message'        => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $service = Service::find($request->service_id);

        if (!$service || !$service->is_active) {
            return response()->json(['message' => 'Service not available'], 404);
        }

        // Resolve price: package price > explicit price > service base price
        $price = $request->price;
        if ($request->package_id) {
            $package = ServicePackage::where('service_id', $service->id)->find($request->package_id);
            if ($package) {
                $price = $package->price;
            }
        }
        if (!$price && $request->booking_type === 'instant') {
            $price = $service->price;
        }

        $booking = Booking::create([
            'customer_id' => $user->id,
            'vendor_id' => $service->vendor_id,
            'service_id' => $service->id,
            'package_id' => $request->package_id,
            'booking_type' => $request->booking_type,
            'status' => 'pending',
            'price' => $price,
            'scheduled_time' => $request->scheduled_time,
            'lat' => $request->lat ?? $user->lat,
            'lng' => $request->lng ?? $user->lng,
        ]);

        if ($request->message) {
            $booking->messages()->create([
                'sender_id' => $user->id,
                'receiver_id' => $service->vendor->user_id,
                'message' => $request->message,
            ]);
        }

        // Send notification to vendor
        NotificationController::sendNotification(
            $service->vendor->user_id,
            'booking',
            'New Booking Request',
            "You have a new booking request for {$service->name} from {$user->name}.",
            ['booking_id' => $booking->id]
        );

        // Send email to vendor
        $vendorUser = User::find($service->vendor->user_id);
        if ($vendorUser && $vendorUser->email) {
            try {
                Mail::to($vendorUser->email)->queue(new BookingMail(
                    recipientName: $vendorUser->name,
                    subject: "New Booking Request – {$service->name}",
                    heading: 'You have a new booking request',
                    body: "{$user->name} has requested your service \"{$service->name}\". Log in to review and accept.",
                    actionUrl: config('app.url') . '/vendor-dashboard',
                    actionLabel: 'View Booking',
                ));
            } catch (\Exception $e) {
                \Log::error('Booking email notification failed: ' . $e->getMessage());
            }
        }

        return response()->json([
            'booking' => $booking->load(['service.category', 'service.vendor', 'customer']),
            'message' => 'Booking created successfully'
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();
        $booking = Booking::with(['service.vendor'])->find($id);

        if (!$booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        if ($user->role === 'customer' && $booking->customer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->role === 'vendor') {
            $vendorId = $user->vendor?->id;
            if (!$vendorId || $booking->vendor_id !== $vendorId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,accepted,in_progress,completed,cancelled',
            'price' => 'sometimes|numeric|min:0',
            'scheduled_time' => 'sometimes|date|after:now',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $oldStatus = $booking->status;
        if ($user->role === 'vendor') {
            if ($booking->status === 'pending' && $request->status === 'accepted') {
                if ($request->price) {
                    $booking->price = $request->price;
                }
            } elseif (!in_array($request->status, ['accepted', 'in_progress', 'completed', 'cancelled'])) {
                return response()->json(['message' => 'Vendors can only accept, start, complete, or cancel bookings'], 403);
            }
        } elseif ($user->role === 'customer') {
            if (!in_array($request->status, ['cancelled'])) {
                return response()->json(['message' => 'Customers can only cancel bookings'], 403);
            }
        }

        $booking->update($request->only(['status', 'price', 'scheduled_time']));

        // Award loyalty points when booking is completed (1 point per Rs. 10)
        if ($oldStatus !== 'completed' && $booking->status === 'completed') {
            $price = $booking->price ?? $booking->service?->price ?? 0;
            $points = max(1, (int) floor($price / 10));
            \App\Models\User::where('id', $booking->customer_id)->increment('loyalty_points', $points);

            // Release escrow: mark payment as released to vendor
            if ($booking->payment_status === 'paid') {
                $booking->update([
                    'payment_status' => 'released',
                    'released_at'    => now(),
                ]);

                // Mark commission as eligible for payout
                \App\Models\Commission::where('booking_id', $booking->id)
                    ->where('status', 'pending')
                    ->update(['status' => 'paid', 'paid_at' => now()]);
            }
        }

        // Refund if cancelled after payment
        if ($booking->status === 'cancelled' && in_array($booking->payment_status, ['paid', 'released'])) {
            $booking->update(['payment_status' => 'refunded']);

            \App\Models\Commission::where('booking_id', $booking->id)
                ->where('status', 'pending')
                ->update(['status' => 'refunded']);
        }

        // Send notification to the other party
        $recipientId = ($user->id === $booking->customer_id) ? $booking->service->vendor->user_id : $booking->customer_id;
        if ($oldStatus !== $booking->status) {
            NotificationController::sendNotification(
                $recipientId,
                'booking',
                'Booking Status Updated',
                "Your booking for {$booking->service->name} is now {$booking->status}.",
                ['booking_id' => $booking->id]
            );

            // Email the recipient about status change
            $recipient = User::find($recipientId);
            if ($recipient && $recipient->email) {
                $statusLabels = [
                    'accepted'    => 'accepted',
                    'in_progress' => 'in progress',
                    'completed'   => 'completed',
                    'cancelled'   => 'cancelled',
                ];
                $statusLabel = $statusLabels[$booking->status] ?? $booking->status;
                try {
                    Mail::to($recipient->email)->queue(new BookingMail(
                        recipientName: $recipient->name,
                        subject: "Booking {$statusLabel} – {$booking->service->name}",
                        heading: "Your booking has been {$statusLabel}",
                        body: "Your booking for \"{$booking->service->name}\" has been marked as {$statusLabel}.",
                        actionUrl: config('app.url') . '/dashboard',
                        actionLabel: 'View My Bookings',
                    ));
                } catch (\Exception $e) {
                    \Log::error('Booking status email notification failed: ' . $e->getMessage());
                }
            }
        }

        return response()->json([
            'booking' => $booking->load(['service.category', 'service.vendor', 'customer']),
            'message' => 'Booking updated successfully'
        ]);
    }

    public function destroy($id)
    {
        $user = request()->user();
        $booking = Booking::find($id);

        if (!$booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        if ($booking->customer_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (!in_array($booking->status, ['pending', 'cancelled'])) {
            return response()->json(['message' => 'Cannot delete booking in progress'], 403);
        }

        $booking->delete();

        return response()->json(['message' => 'Booking deleted successfully']);
    }

    public function createRequest(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'customer') {
            return response()->json(['message' => 'Only customers can create booking requests'], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'text' => 'required|string|max:2000',
            'category_id' => 'nullable|exists:categories,id',
            'budget' => 'nullable|numeric|min:0',
            'preferred_date' => 'nullable|date|after:today',
            'urgency' => 'nullable|in:asap,this_week,this_month,flexible',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $bookingRequest = BookingRequest::create([
            'customer_id' => $user->id,
            'title' => $request->title,
            'text' => $request->text,
            'category_id' => $request->category_id,
            'budget' => $request->budget,
            'preferred_date' => $request->preferred_date,
            'urgency' => $request->urgency ?? 'flexible',
            'lat' => $request->lat ?? $user->lat,
            'lng' => $request->lng ?? $user->lng,
            'status' => 'open',
        ]);

        // Notify vendors who have active services in the same category
        if ($request->category_id) {
            $categoryName = \App\Models\Category::find($request->category_id)?->name ?? 'your category';
            $vendorUserIds = \App\Models\Service::where('category_id', $request->category_id)
                ->where('is_active', true)
                ->with('vendor:id,user_id')
                ->get()
                ->pluck('vendor.user_id')
                ->unique()
                ->filter()
                ->values();

            $notifications = $vendorUserIds->map(fn($uid) => [
                'user_id' => $uid,
                'type' => 'booking_request',
                'title' => 'New service request in your area',
                'message' => "A customer is looking for {$categoryName} services: \"{$request->title}\"",
                'data' => json_encode(['booking_request_id' => $bookingRequest->id]),
                'is_read' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ])->toArray();

            if (!empty($notifications)) {
                \App\Models\Notification::insert($notifications);
            }
        }

        return response()->json([
            'booking_request' => $bookingRequest->load(['customer']),
            'message' => 'Booking request created successfully'
        ], 201);
    }

    public function getRequests(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'vendor' && $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = BookingRequest::with(['customer', 'category'])
            ->where('status', 'open')
            ->orderBy('created_at', 'desc');

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->lat && $request->lng && $request->radius) {
            $query->whereRaw(
                '(6371 * acos(cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?)) + sin(radians(?)) * sin(radians(lat)))) <= ?',
                [$request->lat, $request->lng, $request->lat, $request->radius]
            );
        }

        $requests = $query->paginate(10);

        return response()->json($requests);
    }

    /**
     * Vendor responds to a booking request with a quote
     */
    public function respondToRequest(Request $request, $id)
    {
        $user = $request->user();

        if ($user->role !== 'vendor') {
            return response()->json(['message' => 'Only vendors can respond to requests'], 403);
        }

        $bookingRequest = BookingRequest::find($id);
        if (!$bookingRequest || $bookingRequest->status !== 'open') {
            return response()->json(['message' => 'Request not found or closed'], 404);
        }

        $validator = Validator::make($request->all(), [
            'service_id' => 'required|exists:services,id',
            'price' => 'required|numeric|min:0',
            'message' => 'nullable|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $service = Service::where('id', $request->service_id)
            ->where('vendor_id', $user->vendor->id)
            ->first();

        if (!$service) {
            return response()->json(['message' => 'Invalid service for this vendor'], 403);
        }

        // Create a booking of type 'quote'
        $booking = Booking::create([
            'customer_id' => $bookingRequest->customer_id,
            'vendor_id' => $user->vendor->id,
            'service_id' => $service->id,
            'booking_type' => 'quote',
            'status' => 'pending',
            'price' => $request->price,
            'lat' => $bookingRequest->lat,
            'lng' => $bookingRequest->lng,
        ]);

        if ($request->message) {
            $booking->messages()->create([
                'sender_id' => $user->id,
                'receiver_id' => $bookingRequest->customer_id,
                'message' => $request->message,
            ]);
        }

        // Send notification to customer
        NotificationController::sendNotification(
            $bookingRequest->customer_id,
            'booking',
            'New Quote Received',
            "{$user->name} has sent a quote for your service request.",
            ['booking_id' => $booking->id]
        );

        // Mark request as closed? Maybe keep open for other quotes?
        // Let's keep it open but maybe add a relationship if needed.

        return response()->json([
            'booking' => $booking->load(['service.category', 'service.vendor', 'customer']),
            'message' => 'Quote sent successfully'
        ], 201);
    }

    // ── Reschedule ─────────────────────────────────────────────────────────────

    /** POST /api/bookings/{id}/reschedule — customer requests a new date */
    public function requestReschedule(Request $request, $id)
    {
        $user = $request->user();
        $booking = Booking::find($id);

        if (!$booking) return response()->json(['message' => 'Booking not found'], 404);
        if ($booking->customer_id !== $user->id) return response()->json(['message' => 'Unauthorized'], 403);
        if (!in_array($booking->status, ['pending', 'accepted'])) {
            return response()->json(['message' => 'Can only reschedule pending or accepted bookings'], 422);
        }

        $request->validate(['reschedule_to' => 'required|date|after:now']);

        $booking->update([
            'reschedule_to'           => $request->reschedule_to,
            'reschedule_requested_at' => now(),
            'reschedule_status'       => 'pending',
        ]);

        // Notify vendor
        NotificationController::sendNotification(
            $booking->vendor?->user_id ?? $booking->vendor_id,
            'booking',
            'Reschedule Requested',
            "A customer has requested to reschedule their booking.",
            ['booking_id' => $booking->id]
        );

        return response()->json(['booking' => $booking, 'message' => 'Reschedule request sent']);
    }

    /** POST /api/bookings/{id}/reschedule-respond — vendor accepts or declines */
    public function respondReschedule(Request $request, $id)
    {
        $user = $request->user();
        $booking = Booking::with('service.vendor')->find($id);

        if (!$booking) return response()->json(['message' => 'Booking not found'], 404);

        $vendorId = $user->vendor?->id;
        if (!$vendorId || $booking->vendor_id !== $vendorId) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ($booking->reschedule_status !== 'pending') {
            return response()->json(['message' => 'No pending reschedule request'], 422);
        }

        $request->validate(['action' => 'required|in:accept,decline']);

        if ($request->action === 'accept') {
            $booking->update([
                'scheduled_time'    => $booking->reschedule_to,
                'reschedule_status' => 'accepted',
            ]);
        } else {
            $booking->update(['reschedule_status' => 'declined']);
        }

        // Notify customer
        $label = $request->action === 'accept' ? 'accepted' : 'declined';
        NotificationController::sendNotification(
            $booking->customer_id,
            'booking',
            "Reschedule {$label}",
            "Your reschedule request has been {$label}.",
            ['booking_id' => $booking->id]
        );

        return response()->json(['booking' => $booking, 'message' => "Reschedule {$label}"]);
    }
}
