<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use App\Models\Vendor;
use App\Models\Review;
use App\Models\Booking;
use App\Models\VendorAvailability;
use App\Models\VendorFeature;

class VendorController extends Controller
{
    public function featured()
    {
        $vendors = Vendor::with(['user:id,name', 'services' => fn($q) => $q->where('is_active', true)->with('category:id,name')])
            ->where('is_featured', true)
            ->where('is_verified', true)
            ->orderByDesc('rating')
            ->take(6)
            ->get();

        return response()->json($vendors);
    }

    public function show($id)
    {
        $vendor = Vendor::with([
            'user:id,name,created_at,phone',
            'services' => function ($q) {
                $q->with('category:id,name')->where('is_active', true)->orderBy('created_at', 'desc');
            },
        ])->find($id);

        if (!$vendor) {
            return response()->json(['message' => 'Vendor not found'], 404);
        }

        $reviewCount = Review::where('vendor_id', $id)->count();
        $completedJobs = Booking::where('vendor_id', $id)->where('status', 'completed')->count();

        // Average response time
        $avgResponseHours = Booking::where('vendor_id', $id)
            ->where('status', '!=', 'pending')
            ->whereNotNull('updated_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) as avg_hours')
            ->value('avg_hours');

        // Auto-compute and upsert badges
        $avgRating = (float) ($vendor->rating ?? 0);
        \App\Models\VendorBadge::updateOrCreate(['vendor_id' => $id], [
            'top_rated'      => $avgRating >= 4.5 && $reviewCount >= 5,
            'fast_responder' => $avgResponseHours !== null && $avgResponseHours <= 2,
            'verified_pro'   => (bool) $vendor->is_verified && $completedJobs >= 10,
            'popular'        => $completedJobs >= 20,
            'new_vendor'     => $vendor->created_at?->diffInDays(now()) <= 30,
        ]);
        $badges = \App\Models\VendorBadge::where('vendor_id', $id)->first();

        return response()->json([
            'vendor' => $vendor,
            'review_count' => $reviewCount,
            'completed_jobs' => $completedJobs,
            'avg_response_hours' => $avgResponseHours ? round((float) $avgResponseHours, 1) : null,
            'badges' => $badges ? $badges->earned() : [],
        ]);
    }

    public function profile(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'vendor') {
            return response()->json(['message' => 'Only vendors have a vendor profile'], 403);
        }

        $vendor = Vendor::where('user_id', $user->id)->first();

        if (!$vendor) {
            return response()->json(['message' => 'Vendor profile not found'], 404);
        }

        return response()->json($vendor);
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'vendor') {
            return response()->json(['message' => 'Only vendors can update vendor profile'], 403);
        }

        $vendor = Vendor::where('user_id', $user->id)->first();

        if (!$vendor) {
            return response()->json(['message' => 'Vendor profile not found'], 404);
        }

        $validator = Validator::make($request->all(), [
            'business_name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'service_area_radius' => 'sometimes|required|integer|min:1|max:500',
            'service_radius_km' => 'sometimes|nullable|integer|min:0|max:500',
            'location' => 'sometimes|nullable|string|max:255',
            'website' => 'sometimes|nullable|url|max:255',
            'instagram' => 'sometimes|nullable|string|max:255',
            'facebook' => 'sometimes|nullable|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $vendor->update($request->only([
            'business_name',
            'description',
            'service_area_radius',
            'service_radius_km',
            'location',
            'website',
            'instagram',
            'facebook',
        ]));

        return response()->json([
            'vendor' => $vendor,
            'message' => 'Vendor profile updated successfully'
        ]);
    }

    /** GET /api/vendor/features — authenticated vendor gets their feature flags */
    public function getFeatures(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'vendor') {
            return response()->json(['message' => 'Only vendors can access this'], 403);
        }
        $vendor = Vendor::where('user_id', $user->id)->first();
        if (!$vendor) return response()->json(['message' => 'Vendor profile not found'], 404);

        $rows = VendorFeature::where('vendor_id', $vendor->id)->pluck('is_enabled', 'feature');
        $features = [];
        foreach (Vendor::ALL_FEATURES as $feature) {
            $features[$feature] = $rows->has($feature) ? (bool) $rows->get($feature) : true;
        }
        return response()->json(['features' => $features]);
    }

    // ── Availability ──────────────────────────────────────────────────────────

    /** POST /api/vendor/avatar — upload vendor avatar */
    public function uploadAvatar(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'vendor') {
            return response()->json(['message' => 'Only vendors can upload an avatar'], 403);
        }
        $vendor = Vendor::where('user_id', $user->id)->first();
        if (!$vendor) return response()->json(['message' => 'Vendor profile not found'], 404);

        $validator = Validator::make($request->all(), [
            'avatar' => 'required|file|mimes:jpg,jpeg,png,webp|max:2048',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        // Delete old avatar file if stored locally
        if ($vendor->avatar && str_starts_with($vendor->avatar, '/storage/')) {
            $old = str_replace('/storage/', '', $vendor->avatar);
            Storage::disk('public')->delete($old);
        }

        $file     = $request->file('avatar');
        $fileName = 'avatars/' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();
        Storage::disk('public')->makeDirectory('avatars');
        $file->storeAs('avatars', $user->id . '_' . time() . '.' . $file->getClientOriginalExtension(), 'public');
        $path = '/storage/' . $fileName;
        $vendor->update(['avatar' => $path]);

        return response()->json(['avatar' => $path, 'message' => 'Avatar updated']);
    }

    /** GET /api/vendor/availability — authenticated vendor gets their schedule */
    public function getAvailability(Request $request)
    {
        $user = $request->user();
        $vendor = Vendor::where('user_id', $user->id)->first();
        if (!$vendor) return response()->json(['message' => 'Vendor profile not found'], 404);

        $rows = VendorAvailability::where('vendor_id', $vendor->id)->get()->keyBy('day_of_week');

        // Return all 7 days, filling defaults for missing rows
        $days = [];
        for ($d = 0; $d <= 6; $d++) {
            $row = $rows->get($d);
            $days[] = [
                'day_of_week'  => $d,
                'start_time'   => $row?->start_time ?? '09:00',
                'end_time'     => $row?->end_time   ?? '17:00',
                'is_available' => $row?->is_available ?? ($d >= 1 && $d <= 5), // Mon-Fri default on
            ];
        }

        return response()->json(['availability' => $days]);
    }

    /** PUT /api/vendor/availability — upsert entire schedule */
    public function updateAvailability(Request $request)
    {
        $user = $request->user();
        $vendor = Vendor::where('user_id', $user->id)->first();
        if (!$vendor) return response()->json(['message' => 'Vendor profile not found'], 404);

        $validator = Validator::make($request->all(), [
            'availability'               => 'required|array|min:7|max:7',
            'availability.*.day_of_week' => 'required|integer|between:0,6',
            'availability.*.start_time'  => 'required|date_format:H:i',
            'availability.*.end_time'    => 'required|date_format:H:i|after:availability.*.start_time',
            'availability.*.is_available' => 'required|boolean',
        ]);

        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        foreach ($request->availability as $slot) {
            // Vendors may NOT modify Saturday (6) or Sunday (0) — admin-only
            if (in_array((int) $slot['day_of_week'], [0, 6])) continue;

            VendorAvailability::updateOrCreate(
                ['vendor_id' => $vendor->id, 'day_of_week' => $slot['day_of_week']],
                ['start_time' => $slot['start_time'] . ':00', 'end_time' => $slot['end_time'] . ':00', 'is_available' => $slot['is_available']]
            );
        }

        return response()->json(['message' => 'Availability updated']);
    }

    /** GET /api/vendors/{id}/availability — public: get vendor availability */
    public function publicAvailability($id)
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

    public function index(Request $request)
    {
        $query = Vendor::with(['user:id,name', 'services' => fn($q) => $q->where('is_active', true)->select('id', 'vendor_id', 'name', 'price', 'category_id')])
            ->where('is_verified', true);

        if ($request->search) {
            $query->where('business_name', 'LIKE', '%' . $request->search . '%');
        }

        if ($request->category_id) {
            $query->whereHas('services', fn($q) => $q->where('category_id', $request->category_id)->where('is_active', true));
        }

        $vendors = $query->orderByDesc('rating')->paginate($request->get('per_page', 15));
        return response()->json($vendors);
    }
}
