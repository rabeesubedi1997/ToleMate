<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorFeature;
use App\Models\VendorDocument;
use App\Models\VendorAvailability;
use App\Models\Service;
use App\Models\Booking;
use App\Models\Category;

class AdminController extends Controller
{
    public function __construct()
    {
        $this->middleware('role:admin,super_admin');
    }

    public function getDashboardStats(Request $request)
    {
        $monthly = \App\Models\Booking::selectRaw("DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as bookings, SUM(price) as revenue")
            ->where('created_at', '>=', now()->subMonths(6)->startOfMonth())
            ->groupBy('month')
            ->orderBy('month')
            ->get()
            ->keyBy('month');

        $monthlyData = [];
        for ($i = 5; $i >= 0; $i--) {
            $key = now()->subMonths($i)->format('Y-m');
            $label = now()->subMonths($i)->format('M');
            $monthlyData[] = [
                'month' => $label,
                'bookings' => $monthly[$key]->bookings ?? 0,
                'revenue' => (float)($monthly[$key]->revenue ?? 0),
            ];
        }

        $stats = [
            'total_users' => \App\Models\User::count(),
            'total_vendors' => \App\Models\Vendor::count(),
            'total_services' => \App\Models\Service::count(),
            'active_services' => \App\Models\Service::where('is_active', true)->count(),
            'total_bookings' => \App\Models\Booking::count(),
            'completed_bookings' => \App\Models\Booking::where('status', 'completed')->count(),
            'pending_bookings' => \App\Models\Booking::where('status', 'pending')->count(),
            'pending_services' => \App\Models\Service::where('status', 'pending')->count(),
            'monthly' => $monthlyData,
            'recent_activity' => $this->buildRecentActivity(),
        ];

        return response()->json($stats);
    }

    public function getUsers(Request $request)
    {
        $users = User::orderBy('created_at', 'desc')->paginate(15);
        return response()->json($users);
    }

    public function getUser(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        return response()->json($user);
    }

    public function updateUser(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->role === 'super_admin' && $request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Cannot modify super admin accounts'], 403);
        }

        $validRoles = $request->user()->role === 'super_admin' ? 'customer,vendor,admin,super_admin' : 'customer,vendor,admin';

        $request->validate([
            'name'          => 'sometimes|string|max:255',
            'email'         => 'sometimes|email|unique:users,email,' . $id,
            'phone'         => 'sometimes|nullable|string|max:20',
            'role'          => 'sometimes|in:' . $validRoles,
            'business_name' => 'nullable|string|max:255',
            'description'   => 'nullable|string',
        ]);

        $user->update($request->only(['name', 'email', 'phone', 'role']));

        if ($user->role === 'vendor' && !$user->vendor) {
            $businessName = $request->business_name ?? $user->name . "'s Business";
            Vendor::create([
                'user_id'             => $user->id,
                'business_name'       => $businessName,
                'description'         => $request->description ?? 'New vendor on ToleMate',
                'rating'              => 0.0,
                'service_area_radius' => 10,
                'whatsapp_number'     => $user->phone,
            ]);
        }

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user
        ]);
    }

    public function deleteUser(Request $request, $id)
    {
        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete your own account'], 400);
        }

        if (in_array($user->role, ['admin', 'super_admin']) && $request->user()->role !== 'super_admin') {
            return response()->json(['message' => 'Cannot delete admin accounts'], 403);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    public function getServices(Request $request)
    {
        $services = Service::with(['category', 'vendor'])->orderBy('created_at', 'desc')->paginate(15);
        return response()->json($services);
    }

    public function getReviews(Request $request)
    {
        $reviews = \App\Models\Review::with(['customer', 'vendor', 'booking.service'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($reviews);
    }

    public function deleteReview(Request $request, $id)
    {
        $review = \App\Models\Review::find($id);
        if (!$review) {
            return response()->json(['message' => 'Review not found'], 404);
        }

        $review->delete();

        return response()->json(['message' => 'Review deleted successfully']);
    }

    public function getVendors(Request $request)
    {
        $vendors = Vendor::with('user')
            ->withCount('services')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($vendors);
    }

    public function getVendorBookings(Request $request, $id)
    {
        $vendor = Vendor::find($id);
        if (!$vendor) {
            return response()->json(['message' => 'Vendor not found'], 404);
        }

        $bookings = Booking::with(['service', 'customer'])
            ->where('vendor_id', $vendor->id)
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($bookings);
    }

    public function getVendorMessages(Request $request, $id)
    {
        $vendor = Vendor::find($id);
        if (!$vendor) {
            return response()->json(['message' => 'Vendor not found'], 404);
        }

        $messages = \App\Models\Message::with('sender')
            ->where(function ($q) use ($vendor) {
                $q->where('sender_id', $vendor->user_id)
                    ->orWhere('receiver_id', $vendor->user_id);
            })
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($messages);
    }

    public function storeReview(Request $request)
    {
        $request->validate([
            'vendor_id'  => 'required|exists:vendors,id',
            'booking_id' => 'required|exists:bookings,id',
            'rating'     => 'required|integer|between:1,5',
            'comment'    => 'nullable|string|max:1000',
        ]);

        $review = \App\Models\Review::create([
            'customer_id' => $request->user()->id,
            'vendor_id'   => $request->vendor_id,
            'booking_id'  => $request->booking_id,
            'rating'      => $request->rating,
            'comment'     => $request->comment,
        ]);

        return response()->json(['message' => 'Review submitted', 'review' => $review], 201);
    }

    public function createUser(Request $request)
    {
        $allowedRoles = $request->user()->role === 'super_admin' ? 'customer,vendor,admin,super_admin' : 'customer,vendor';

        $request->validate([
            'name'          => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'password'      => 'required|string|min:6',
            'role'          => 'required|in:' . $allowedRoles,
            'phone'         => 'nullable|string|max:20',
            'business_name' => 'nullable|string|max:255',
            'description'   => 'nullable|string',
        ]);

        $user = User::create([
            'name'     => $request->name,
            'email'    => $request->email,
            'password' => Hash::make($request->password),
            'role'     => $request->role,
            'phone'    => $request->phone,
        ]);

        if ($user->role === 'vendor') {
            Vendor::create([
                'user_id'             => $user->id,
                'business_name'       => $request->business_name ?: $user->name . "'s Business",
                'description'         => $request->description ?: 'New vendor on ToleMate',
                'rating'              => 0.0,
                'service_area_radius' => 10,
                'whatsapp_number'     => $request->phone,
            ]);
        }

        return response()->json(['message' => 'User created', 'user' => $user], 201);
    }

    public function getAllBookings(Request $request)
    {
        $query = Booking::with(['service.category', 'customer', 'vendor.user']);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $bookings = $query->orderBy('created_at', 'desc')->paginate(20);
        return response()->json($bookings);
    }

    public function updateBookingStatus(Request $request, $id)
    {
        $request->validate(['status' => 'required|in:pending,accepted,in_progress,completed,cancelled']);

        $booking = Booking::find($id);
        if (!$booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $booking->update(['status' => $request->status]);
        return response()->json(['message' => 'Status updated', 'booking' => $booking]);
    }

    public function getCategories(Request $request)
    {
        return response()->json(Category::withCount('services')->orderBy('name')->get());
    }

    public function createCategory(Request $request)
    {
        $request->validate(['name' => 'required|string|max:255|unique:categories,name']);
        $cat = Category::create(['name' => $request->name, 'parent_id' => $request->parent_id]);
        return response()->json(['message' => 'Category created', 'category' => $cat], 201);
    }

    public function updateCategory(Request $request, $id)
    {
        $cat = Category::find($id);
        if (!$cat) return response()->json(['message' => 'Category not found'], 404);

        $request->validate(['name' => 'required|string|max:255|unique:categories,name,' . $id]);
        $cat->update(['name' => $request->name]);
        return response()->json(['message' => 'Category updated', 'category' => $cat]);
    }

    public function deleteCategory(Request $request, $id)
    {
        $cat = Category::find($id);
        if (!$cat) return response()->json(['message' => 'Category not found'], 404);

        $cat->delete();
        return response()->json(['message' => 'Category deleted']);
    }

    public function getAllConversations(Request $request)
    {
        $conversations = \App\Models\Message::with(['sender', 'receiver'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($conversations);
    }

    public function getVendorServices(Request $request, $id)
    {
        $vendor = Vendor::find($id);
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

        $services = Service::with('category')
            ->where('vendor_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($services);
    }

    public function getVendorFeatures(Request $request, $id)
    {
        $vendor = Vendor::find($id);
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

        $rows = VendorFeature::where('vendor_id', $id)->pluck('is_enabled', 'feature');
        $features = [];
        foreach (Vendor::ALL_FEATURES as $feature) {
            $features[$feature] = $rows->has($feature) ? (bool) $rows->get($feature) : true;
        }
        return response()->json(['features' => $features]);
    }

    public function getVendorAvailability(Request $request, $id)
    {
        $vendor = Vendor::find($id);
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

        $rows = VendorAvailability::where('vendor_id', $id)->get()->keyBy('day_of_week');
        $days = [];
        for ($d = 0; $d <= 6; $d++) {
            $row = $rows->get($d);
            $days[] = [
                'day_of_week'  => $d,
                'start_time'   => $row ? substr($row->start_time, 0, 5) : '09:00',
                'end_time'     => $row ? substr($row->end_time, 0, 5)   : '17:00',
                'is_available' => $row?->is_available ?? ($d >= 1 && $d <= 5),
            ];
        }
        return response()->json(['availability' => $days]);
    }

    // ── Super Admin only — Vendor Write Operations ──────────────────────────

    public function deleteVendor(Request $request, $id)
    {
        $vendor = Vendor::withTrashed()->find($id);
        if (!$vendor) {
            return response()->json(['message' => 'Vendor not found'], 404);
        }

        if ($vendor->trashed()) {
            // Force-delete if already soft-deleted
            $vendor->forceDelete();
        } else {
            // Soft-delete and deactivate services
            Service::where('vendor_id', $id)->update(['is_active' => false]);
            $vendor->delete();
        }

        return response()->json(['message' => 'Vendor deleted successfully']);
    }

    public function verifyVendor(Request $request, $id)
    {
        $vendor = Vendor::find($id);
        if (!$vendor) {
            return response()->json(['message' => 'Vendor not found'], 404);
        }
        $vendor->is_verified = !$vendor->is_verified;
        $vendor->save();
        return response()->json([
            'vendor' => $vendor,
            'message' => $vendor->is_verified ? 'Vendor verified' : 'Vendor verification removed',
        ]);
    }

    // ── KYC / Document Review ─────────────────────────────────────────────────

    public function getKycPending(Request $request)
    {
        $vendors = Vendor::with(['user:id,name,email', 'documents' => fn($q) => $q->where('status', 'pending')])
            ->where('kyc_status', 'pending')
            ->get();

        return response()->json($vendors);
    }

    public function approveKycDocument(Request $request, $id)
    {
        $doc = VendorDocument::with('vendor')->find($id);
        if (!$doc) return response()->json(['message' => 'Document not found'], 404);

        $doc->update([
            'status'      => 'approved',
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        // Check if all documents are approved
        $pending = VendorDocument::where('vendor_id', $doc->vendor_id)
            ->where('status', '!=', 'approved')
            ->count();

        if ($pending === 0) {
            $doc->vendor->update([
                'kyc_status'  => 'verified',
                'is_verified' => true,
            ]);

            NotificationController::sendNotification(
                $doc->vendor->user_id,
                'system',
                'KYC Approved',
                'Your KYC documents have been approved. You are now a verified vendor!',
                ['type' => 'kyc_approved']
            );
        }

        return response()->json(['message' => 'Document approved', 'document' => $doc->fresh()]);
    }

    public function rejectKycDocument(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:1000']);

        $doc = VendorDocument::with('vendor')->find($id);
        if (!$doc) return response()->json(['message' => 'Document not found'], 404);

        $doc->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->reason,
            'reviewed_by'      => $request->user()->id,
            'reviewed_at'      => now(),
        ]);

        $doc->vendor->update(['kyc_status' => 'rejected']);

        NotificationController::sendNotification(
            $doc->vendor->user_id,
            'system',
            'KYC Document Rejected',
            "Your {$doc->type} was rejected. Reason: {$request->reason}",
            ['type' => 'kyc_rejected']
        );

        return response()->json(['message' => 'Document rejected', 'document' => $doc->fresh()]);
    }

    public function featureVendor(Request $request, $id)
    {
        $vendor = Vendor::find($id);
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);
        $vendor->is_featured = !$vendor->is_featured;
        $vendor->save();
        return response()->json(['vendor' => $vendor, 'message' => $vendor->is_featured ? 'Vendor featured' : 'Vendor unfeatured']);
    }

    public function bulkVendorAction(Request $request)
    {
        $validator = \Illuminate\Support\Facades\Validator::make($request->all(), [
            'ids'    => 'required|array|min:1',
            'ids.*'  => 'integer',
            'action' => 'required|in:verify,unverify,feature,unfeature,delete',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        $ids    = $request->input('ids');
        $action = $request->input('action');

        switch ($action) {
            case 'verify':
                Vendor::whereIn('id', $ids)->update(['is_verified' => true]);
                break;
            case 'unverify':
                Vendor::whereIn('id', $ids)->update(['is_verified' => false]);
                break;
            case 'feature':
                Vendor::whereIn('id', $ids)->update(['is_featured' => true]);
                break;
            case 'unfeature':
                Vendor::whereIn('id', $ids)->update(['is_featured' => false]);
                break;
            case 'delete':
                Vendor::whereIn('id', $ids)->get()->each->delete();
                Service::whereIn('vendor_id', $ids)->update(['is_active' => false]);
                break;
        }

        return response()->json(['message' => "Bulk $action applied to " . count($ids) . " vendor(s)"]);
    }

    public function updateVendorPlan(Request $request, $id)
    {
        $vendor = Vendor::findOrFail($id);
        $plan = $request->input('plan');
        if (!in_array($plan, ['free', 'basic', 'pro'])) {
            return response()->json(['message' => 'Invalid plan'], 422);
        }
        $vendor->update(['subscription_plan' => $plan]);
        return response()->json(['message' => "Plan updated to $plan", 'vendor' => $vendor]);
    }

    public function updateVendorFeatures(Request $request, $id)
    {
        $vendor = Vendor::find($id);
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

    $validator = Validator::make($request->all(), [
        'features'   => 'required|array|min:1',
        'features.*' => 'boolean',
    ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        foreach ($request->features as $feature => $isEnabled) {
            if (!in_array($feature, Vendor::ALL_FEATURES)) continue;
            VendorFeature::updateOrCreate(
                ['vendor_id' => $id, 'feature' => $feature],
                ['is_enabled' => (bool) $isEnabled]
            );
        }
        return response()->json(['message' => 'Features updated successfully']);
    }

    public function updateVendorAvailability(Request $request, $id)
    {
        $vendor = Vendor::find($id);
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

        $validator = Validator::make($request->all(), [
            'availability'                => 'required|array|min:7|max:7',
            'availability.*.day_of_week'  => 'required|integer|between:0,6',
            'availability.*.start_time'   => 'required|date_format:H:i',
            'availability.*.end_time'     => 'required|date_format:H:i',
            'availability.*.is_available' => 'required|boolean',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        foreach ($request->availability as $slot) {
            VendorAvailability::updateOrCreate(
                ['vendor_id' => $vendor->id, 'day_of_week' => $slot['day_of_week']],
                ['start_time' => $slot['start_time'] . ':00', 'end_time' => $slot['end_time'] . ':00', 'is_available' => $slot['is_available']]
            );
        }
        return response()->json(['message' => 'Availability updated']);
    }

    public function updateVendorProfile(Request $request, $id)
    {
        $vendor = Vendor::find($id);
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

        $validator = Validator::make($request->all(), [
            'business_name'       => 'sometimes|required|string|max:255',
            'description'         => 'sometimes|required|string',
            'service_area_radius' => 'sometimes|required|integer|min:1|max:500',
            'service_radius_km'   => 'sometimes|nullable|integer|min:0|max:500',
            'website'             => 'sometimes|nullable|url|max:255',
            'instagram'           => 'sometimes|nullable|string|max:255',
            'facebook'            => 'sometimes|nullable|string|max:255',
            'whatsapp_number'     => 'sometimes|nullable|string|max:20',
            'avatar'              => 'sometimes|nullable|string|max:255',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $vendor->update($request->only([
            'business_name', 'description', 'service_area_radius', 'service_radius_km',
            'website', 'instagram', 'facebook', 'whatsapp_number', 'avatar',
        ]));

        return response()->json(['message' => 'Vendor profile updated', 'vendor' => $vendor->fresh()->load('user')]);
    }

    private function buildRecentActivity(): array
    {
        $bookings = \App\Models\Booking::with(['service:id,name', 'customer:id,name'])
            ->orderByDesc('created_at')->take(8)->get()
            ->map(fn($b) => [
                'type'    => 'booking',
                'text'    => ($b->customer->name ?? 'Customer') . ' booked ' . ($b->service->name ?? 'a service'),
                'status'  => $b->status,
                'time'    => $b->created_at->diffForHumans(),
            ]);

        $registrations = \App\Models\User::orderByDesc('created_at')->take(5)->get()
            ->map(fn($u) => [
                'type' => 'user',
                'text' => $u->name . ' joined as ' . $u->role,
                'time' => $u->created_at->diffForHumans(),
            ]);

        return collect($bookings)->merge($registrations)
            ->sortByDesc(fn($item) => $item['time'])
            ->values()
            ->take(10)
            ->toArray();
    }

    public function getAnalytics(Request $request)
    {
        return $this->getDashboardStats($request);
    }
}
