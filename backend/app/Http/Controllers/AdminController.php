<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;
use App\Models\Vendor;
use App\Models\VendorFeature;
use App\Models\VendorAvailability;
use App\Models\Service;
use App\Models\Booking;
use App\Models\Category;

class AdminController extends Controller
{
    /**
     * Get overall system statistics for the admin dashboard
     */
    public function getDashboardStats(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Monthly bookings for the last 6 months
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
            'monthly' => $monthlyData,
            'recent_activity' => $this->buildRecentActivity(),
        ];

        return response()->json($stats);
    }

    /**
     * List all users with pagination
     */
    public function getUsers(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $users = User::orderBy('created_at', 'desc')->paginate(15);
        return response()->json($users);
    }

    /**
     * Get single user for editing
     */
    public function getUser(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        return response()->json($user);
    }

    /**
     * Update user profile (Admin only)
     */
    public function updateUser(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $id,
            'role' => 'sometimes|in:customer,vendor,admin',
        ]);

        $user->update($request->only(['name', 'email', 'role']));

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user
        ]);
    }

    /**
     * Delete or Ban user
     */
    public function deleteUser(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete your own account'], 400);
        }

        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    /**
     * List all services for admin moderation
     */
    public function getServices(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $services = Service::with(['category', 'vendor'])->orderBy('created_at', 'desc')->paginate(15);
        return response()->json($services);
    }

    /**
     * Get all reviews for moderation
     */
    public function getReviews(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $reviews = \App\Models\Review::with(['customer', 'vendor', 'booking.service'])
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return response()->json($reviews);
    }

    /**
     * Delete a review (Admin only)
     */
    public function deleteReview(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $review = \App\Models\Review::find($id);
        if (!$review) {
            return response()->json(['message' => 'Review not found'], 404);
        }

        $review->delete();

        return response()->json(['message' => 'Review deleted successfully']);
    }

    /**
     * List all vendors with user info and services count
     */
    public function getVendors(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $vendors = Vendor::with('user')
            ->withCount('services')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($vendors);
    }

    /**
     * Delete a vendor and their services
     */
    public function deleteVendor(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $vendor = Vendor::find($id);
        if (!$vendor) {
            return response()->json(['message' => 'Vendor not found'], 404);
        }

        // Delete all services belonging to this vendor
        Service::where('vendor_id', $id)->delete();

        $vendor->delete();

        return response()->json(['message' => 'Vendor deleted successfully']);
    }

    /**
     * Toggle vendor verified status
     */
    public function verifyVendor(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

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

    public function featureVendor(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $vendor = Vendor::find($id);
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);
        $vendor->is_featured = !$vendor->is_featured;
        $vendor->save();
        return response()->json(['vendor' => $vendor, 'message' => $vendor->is_featured ? 'Vendor featured' : 'Vendor unfeatured']);
    }

    /** POST /api/admin/vendors/bulk — perform bulk action on multiple vendors */
    public function bulkVendorAction(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
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
                $vendors = Vendor::whereIn('id', $ids)->with('user')->get();
                foreach ($vendors as $v) {
                    \App\Models\Service::where('vendor_id', $v->id)->delete();
                    if ($v->user) $v->user->delete();
                    $v->delete();
                }
                break;
        }

        return response()->json(['message' => "Bulk $action applied to " . count($ids) . " vendor(s)"]);
    }

    public function updateVendorPlan(Request $request, $id)
    {
        $vendor = \App\Models\Vendor::findOrFail($id);
        $plan = $request->input('plan');
        if (!in_array($plan, ['free', 'basic', 'pro'])) {
            return response()->json(['message' => 'Invalid plan'], 422);
        }
        $vendor->update(['subscription_plan' => $plan]);
        return response()->json(['message' => "Plan updated to $plan", 'vendor' => $vendor]);
    }

    /**
     * Get all bookings for a specific vendor
     */
    public function getVendorBookings(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

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

    /**
     * Get all messages (chats) involving a specific vendor
     */
    public function getVendorMessages(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

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

    /**
     * Store a review (used by customers post-booking)
     */
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

    /** Create a new user (Admin) */
    public function createUser(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'name'          => 'required|string|max:255',
            'email'         => 'required|email|unique:users,email',
            'password'      => 'required|string|min:6',
            'role'          => 'required|in:customer,vendor,admin',
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
            ]);
        }

        return response()->json(['message' => 'User created', 'user' => $user], 201);
    }

    /** Get all bookings (Admin) */
    public function getAllBookings(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Booking::with(['service.category', 'customer', 'vendor.user']);

        if ($request->status) {
            $query->where('status', $request->status);
        }

        $bookings = $query->orderBy('created_at', 'desc')->paginate(20);
        return response()->json($bookings);
    }

    /** Update booking status (Admin) */
    public function updateBookingStatus(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate(['status' => 'required|in:pending,accepted,in_progress,completed,cancelled']);

        $booking = Booking::find($id);
        if (!$booking) {
            return response()->json(['message' => 'Booking not found'], 404);
        }

        $booking->update(['status' => $request->status]);
        return response()->json(['message' => 'Status updated', 'booking' => $booking]);
    }

    /** List all categories (Admin) */
    public function getCategories(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(Category::withCount('services')->orderBy('name')->get());
    }

    /** Create category (Admin) */
    public function createCategory(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate(['name' => 'required|string|max:255|unique:categories,name']);
        $cat = Category::create(['name' => $request->name, 'parent_id' => $request->parent_id]);
        return response()->json(['message' => 'Category created', 'category' => $cat], 201);
    }

    /** Update category (Admin) */
    public function updateCategory(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $cat = Category::find($id);
        if (!$cat) return response()->json(['message' => 'Category not found'], 404);

        $request->validate(['name' => 'required|string|max:255|unique:categories,name,' . $id]);
        $cat->update(['name' => $request->name]);
        return response()->json(['message' => 'Category updated', 'category' => $cat]);
    }

    /** Delete category (Admin) */
    public function deleteCategory(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $cat = Category::find($id);
        if (!$cat) return response()->json(['message' => 'Category not found'], 404);

        $cat->delete();
        return response()->json(['message' => 'Category deleted']);
    }

    /** Get all platform conversations (Admin) */
    public function getAllConversations(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $conversations = \App\Models\Message::with(['sender', 'receiver'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($conversations);
    }

    /** Get all services for a specific vendor (Admin) */
    public function getVendorServices(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $vendor = Vendor::find($id);
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

        $services = Service::with('category')
            ->where('vendor_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($services);
    }

    // ── Vendor Feature Flags ──────────────────────────────────────────────────

    /** GET /api/admin/vendors/{id}/features */
    public function getVendorFeatures(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Unauthorized'], 403);

        $vendor = Vendor::find($id);
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

        $rows = VendorFeature::where('vendor_id', $id)->pluck('is_enabled', 'feature');
        $features = [];
        foreach (Vendor::ALL_FEATURES as $feature) {
            $features[$feature] = $rows->has($feature) ? (bool) $rows->get($feature) : true;
        }
        return response()->json(['features' => $features]);
    }

    /** PUT /api/admin/vendors/{id}/features — { features: { bookings: true, messaging: false, ... } } */
    public function updateVendorFeatures(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Unauthorized'], 403);

        $vendor = Vendor::find($id);
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

        $validator = Validator::make($request->all(), [
            'features'   => 'required|array',
            'features.*' => 'boolean',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        foreach ($request->features as $feature => $isEnabled) {
            // Only accept known feature names
            if (!in_array($feature, Vendor::ALL_FEATURES)) continue;
            VendorFeature::updateOrCreate(
                ['vendor_id' => $id, 'feature' => $feature],
                ['is_enabled' => (bool) $isEnabled]
            );
        }
        return response()->json(['message' => 'Features updated successfully']);
    }

    // ── Vendor Availability (Admin — all 7 days) ──────────────────────────────

    /** GET /api/admin/vendors/{id}/availability */
    public function getVendorAvailability(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Unauthorized'], 403);

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

    /** PUT /api/admin/vendors/{id}/availability — admin can edit all 7 days */
    public function updateVendorAvailability(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') return response()->json(['message' => 'Unauthorized'], 403);

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
