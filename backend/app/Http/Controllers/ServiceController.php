<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;
use App\Models\Service;
use App\Models\ServiceImage;
use App\Models\ServicePackage;
use App\Models\Category;
use App\Models\Vendor;

class ServiceController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user('sanctum');
        $query = Service::with(['category', 'vendor', 'images']);

        if ($user) {
            if (in_array($user->role, ['admin', 'super_admin'])) {
                // Admin/super_admin sees all
            } elseif ($user->role === 'vendor') {
                $query->where('vendor_id', $user->vendor->id);
            } else {
                $query->where('status', 'approved')->where('is_active', true);
            }
        } else {
            $query->where('status', 'approved')->where('is_active', true);
        }

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'LIKE', '%' . $request->search . '%')
                    ->orWhere('description', 'LIKE', '%' . $request->search . '%');
            });
        }

        if ($request->min_price) {
            $query->where('price', '>=', $request->min_price);
        }

        if ($request->max_price) {
            $query->where('price', '<=', $request->max_price);
        }

        $lat    = is_numeric($request->lat)    ? (float) $request->lat    : null;
        $lng    = is_numeric($request->lng)    ? (float) $request->lng    : null;
        $radius = is_numeric($request->radius) ? (float) $request->radius : null;

        if ($lat !== null && $lng !== null && $radius !== null && $radius > 0) {
            $query->whereHas('vendor', function ($q) use ($lat, $lng, $radius) {
                $q->whereNotNull('lat')
                    ->whereNotNull('lng')
                    ->whereRaw(
                        '(6371 * acos(cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?)) + sin(radians(?)) * sin(radians(lat)))) <= ?',
                        [$lat, $lng, $lat, $radius]
                    );
            });
        }

        $services = $query->paginate(12);

        return response()->json($services);
    }

    public function show(Request $request, $id)
    {
        $user = $request->user('sanctum');
        $query = Service::with(['category', 'vendor.user:id,phone', 'images', 'packages'])
            ->where('id', $id);

        if ($user && in_array($user->role, ['admin', 'super_admin'])) {
            // Admin/super_admin sees any service
        } elseif ($user && $user->role === 'vendor') {
            $query->where(function ($q) use ($user) {
                $q->where('is_active', true)
                  ->orWhere('vendor_id', $user->vendor->id);
            });
        } else {
            $query->where('status', 'approved')->where('is_active', true);
        }

        $service = $query->first();

        if (!$service) {
            return response()->json(['message' => 'Service not found'], 404);
        }

        return response()->json(['service' => $service]);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if (!in_array($user->role, ['vendor', 'admin', 'super_admin'])) {
            return response()->json(['message' => 'Only vendors and admins can create services'], 403);
        }

        $validator = Validator::make($request->all(), [
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'description' => 'required|string',
            'pricing_type' => 'required|in:fixed,hourly,quote',
            'price' => 'nullable|required_if:pricing_type,fixed,hourly|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'sale_ends_at' => 'nullable|date|after:now',
            'radius' => 'sometimes|integer|min:1|max:100',
            'tags' => 'sometimes|array',
            'tags.*' => 'string|max:50',
            'cancellation_policy' => 'sometimes|nullable|string|max:500',
            'vendor_id' => 'sometimes|exists:vendors,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (in_array($user->role, ['admin', 'super_admin'])) {
            $vendorId = $request->vendor_id;
            $vendor = $vendorId ? Vendor::find($vendorId) : null;
            if (!$vendor) {
                return response()->json(['message' => 'Please select a vendor for this service.'], 422);
            }
        } else {
            $vendor = Vendor::where('user_id', $user->id)->first();
            if (!$vendor) {
                return response()->json(['message' => 'Vendor profile not found'], 404);
            }
            if (!$vendor->canCreateService()) {
                $max = $vendor->getPlanLimit('max_services');
                return response()->json(['message' => "Your {$vendor->subscription_plan} plan allows a maximum of {$max} services."], 403);
            }
        }

        $isAdminCreate = in_array($user->role, ['admin', 'super_admin']);

        $service = Service::create([
            'vendor_id' => $vendor->id,
            'category_id' => $request->category_id,
            'name' => $request->name,
            'description' => $request->description,
            'pricing_type' => $request->pricing_type,
            'price' => $request->price,
            'sale_price' => $request->sale_price,
            'sale_ends_at' => $request->sale_ends_at,
            'status' => $isAdminCreate ? 'approved' : 'pending',
            'is_active' => $isAdminCreate,
            'radius' => $request->radius ?? $vendor->service_area_radius,
            'tags' => $request->tags,
            'cancellation_policy' => $request->cancellation_policy,
        ]);

        if ($request->images) {
            foreach ($request->images as $imageUrl) {
                ServiceImage::create([
                    'service_id' => $service->id,
                    'image_url' => $imageUrl,
                ]);
            }
        }

        return response()->json([
            'service' => $service->load(['category', 'vendor', 'images']),
            'message' => 'Service created successfully'
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->role, ['vendor', 'admin', 'super_admin'])) {
            return response()->json(['message' => 'Only vendors and admins can update services'], 403);
        }

        $service = Service::with('vendor')->find($id);

        if (!$service) {
            return response()->json(['message' => 'Service not found'], 404);
        }

        if (in_array($user->role, ['vendor']) && $service->vendor->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized. This is not your service.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'category_id' => 'sometimes|exists:categories,id',
            'name' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'pricing_type' => 'sometimes|required|in:fixed,hourly,quote',
            'price' => 'sometimes|required_if:pricing_type,fixed,hourly|numeric|min:0',
            'sale_price' => 'nullable|numeric|min:0',
            'sale_ends_at' => 'nullable|date',
            'radius' => 'sometimes|integer|min:1|max:100',
            'tags' => 'sometimes|array',
            'tags.*' => 'string|max:50',
            'cancellation_policy' => 'sometimes|nullable|string|max:500',
            'is_active' => 'sometimes|boolean',
            'vendor_id' => 'sometimes|exists:vendors,id',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Admin/super_admin can reassign a service to a different vendor
        if (in_array($user->role, ['admin', 'super_admin']) && $request->has('vendor_id')) {
            $service->vendor_id = $request->vendor_id;
        }

        // When a vendor edits, reset to pending for re-approval
        if ($user->role === 'vendor' && $service->status === 'approved') {
            $service->status = 'pending';
            $service->is_active = false;
            $service->rejection_reason = null;
        }

        $service->update($request->only([
            'category_id',
            'name',
            'description',
            'pricing_type',
            'price',
            'sale_price',
            'sale_ends_at',
            'radius',
            'tags',
            'is_active',
            'cancellation_policy',
        ]));

        if ($request->has('images')) {
            // Remove old images
            $service->images()->delete();

            // Add new ones
            foreach ($request->images as $imageUrl) {
                ServiceImage::create([
                    'service_id' => $service->id,
                    'image_url' => $imageUrl,
                ]);
            }
        }

        return response()->json([
            'service' => $service->load(['category', 'vendor', 'images']),
            'message' => 'Service updated successfully'
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = $request->user();

        if (!in_array($user->role, ['vendor', 'admin', 'super_admin'])) {
            return response()->json(['message' => 'Only vendors and admins can delete services'], 403);
        }

        $service = Service::with('vendor')->find($id);

        if (!$service) {
            return response()->json(['message' => 'Service not found'], 404);
        }

        if ($user->role === 'vendor' && $service->vendor->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized. This is not your service.'], 403);
        }

        $service->delete();

        return response()->json(['message' => 'Service deleted successfully']);
    }

    // ─── Package CRUD ────────────────────────────────────────────────────────────

    public function storePackage(Request $request, $serviceId)
    {
        $user = $request->user();
        $service = Service::with('vendor')->find($serviceId);

        if (!$service) {
            return response()->json(['message' => 'Service not found'], 404);
        }

        if ($user->role === 'vendor' && $service->vendor->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($user->role !== 'vendor' && $user->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:1000',
            'price' => 'required|numeric|min:0',
            'delivery_days' => 'nullable|integer|min:1',
            'features' => 'nullable|array',
            'features.*' => 'string|max:200',
            'sort_order' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $package = ServicePackage::create([
            'service_id' => $serviceId,
            'name' => $request->name,
            'description' => $request->description,
            'price' => $request->price,
            'delivery_days' => $request->delivery_days,
            'features' => $request->features ?? [],
            'sort_order' => $request->sort_order ?? 0,
            'is_active' => true,
        ]);

        return response()->json(['package' => $package, 'message' => 'Package created'], 201);
    }

    public function updatePackage(Request $request, $serviceId, $packageId)
    {
        $user = $request->user();
        $service = Service::with('vendor')->find($serviceId);
        $package = ServicePackage::where('service_id', $serviceId)->find($packageId);

        if (!$service || !$package) {
            return response()->json(['message' => 'Not found'], 404);
        }

        if ($user->role === 'vendor' && $service->vendor->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:100',
            'description' => 'nullable|string|max:1000',
            'price' => 'sometimes|required|numeric|min:0',
            'delivery_days' => 'nullable|integer|min:1',
            'features' => 'nullable|array',
            'features.*' => 'string|max:200',
            'sort_order' => 'nullable|integer',
            'is_active' => 'boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $package->update($request->only(['name', 'description', 'price', 'delivery_days', 'features', 'sort_order', 'is_active']));

        return response()->json(['package' => $package, 'message' => 'Package updated']);
    }

    public function destroyPackage(Request $request, $serviceId, $packageId)
    {
        $user = $request->user();
        $service = Service::with('vendor')->find($serviceId);
        $package = ServicePackage::where('service_id', $serviceId)->find($packageId);

        if (!$service || !$package) {
            return response()->json(['message' => 'Not found'], 404);
        }

        if ($user->role === 'vendor' && $service->vendor->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $package->delete();

        return response()->json(['message' => 'Package deleted']);
    }

    /** POST /api/services/{id}/image — upload cover image for a service */
    public function uploadImage(Request $request, $id)
    {
        $user = $request->user();
        $service = Service::with('vendor')->find($id);

        if (!$service) return response()->json(['message' => 'Service not found'], 404);
        if ($user->role === 'vendor' && $service->vendor->user_id !== $user->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'image' => 'required|file|mimes:jpg,jpeg,png,webp|max:4096',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        $file     = $request->file('image');
        $fileName = 'services/' . $id . '_' . time() . '.' . $file->getClientOriginalExtension();
        Storage::disk('public')->makeDirectory('services');
        Storage::disk('public')->putFileAs('services', $file, basename($fileName));
        $url = '/storage/' . $fileName;

        // Remove existing images first (one cover image per service for simplicity)
        ServiceImage::where('service_id', $id)->delete();
        $img = ServiceImage::create(['service_id' => $id, 'image_url' => $url]);

        return response()->json(['image' => $img, 'message' => 'Image uploaded']);
    }

    public function search(Request $request)
    {
        $queryStr = $request->input('query');

        $query = Service::with(['category', 'vendor.user:id,lat,lng', 'images'])
            ->where('is_active', true);

        if ($queryStr) {
            $query->where(function ($q) use ($queryStr) {
                $q->where('name', 'LIKE', '%' . $queryStr . '%')
                    ->orWhere('description', 'LIKE', '%' . $queryStr . '%')
                    ->orWhereJsonContains('tags', $queryStr);
            });
        }

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }

        // Price range filters
        if ($request->min_price !== null && $request->min_price !== '') {
            $query->where('price', '>=', (float) $request->min_price);
        }
        if ($request->max_price !== null && $request->max_price !== '') {
            $query->where('price', '<=', (float) $request->max_price);
        }

        // Minimum vendor rating filter
        if ($request->min_rating !== null && $request->min_rating !== '') {
            $query->whereHas('vendor', function ($q) use ($request) {
                $q->where('rating', '>=', (float) $request->min_rating);
            });
        }

        $lat    = is_numeric($request->lat)    ? (float) $request->lat    : null;
        $lng    = is_numeric($request->lng)    ? (float) $request->lng    : null;
        $radius = is_numeric($request->radius) ? (float) $request->radius : null;

        if ($lat !== null && $lng !== null && $radius !== null && $radius > 0) {
            $query->whereHas('vendor.user', function ($q) use ($lat, $lng, $radius) {
                $q->whereNotNull('lat')
                    ->whereNotNull('lng')
                    ->whereRaw(
                        '(6371 * acos(cos(radians(?)) * cos(radians(lat)) * cos(radians(lng) - radians(?)) + sin(radians(?)) * sin(radians(lat)))) <= ?',
                        [$lat, $lng, $lat, $radius]
                    );
            });
        }

        // Sorting
        switch ($request->input('sort_by', 'newest')) {
            case 'price_asc':
                $query->orderBy('price', 'asc');
                break;
            case 'price_desc':
                $query->orderBy('price', 'desc');
                break;
            case 'rating_desc':
                $query->leftJoin('vendors', 'services.vendor_id', '=', 'vendors.id')
                    ->orderBy('vendors.rating', 'desc')
                    ->select('services.*');
                break;
            case 'most_booked':
                $query->withCount('bookings')->orderBy('bookings_count', 'desc');
                break;
            case 'newest':
            default:
                $query->orderBy('services.created_at', 'desc');
                break;
        }

        // Map mode: return all results without pagination (capped at 200)
        if ($request->boolean('map')) {
            $services = $query->limit(200)->get();
            return response()->json(['data' => $services, 'total' => $services->count()]);
        }

        $services = $query->paginate(12);

        return response()->json($services);
    }

    public function vendorServices(Request $request, $id)
    {
        $services = Service::with(['category:id,name', 'images'])
            ->where('vendor_id', $id)
            ->where('is_active', true)
            ->orderByDesc('created_at')
            ->paginate($request->get('per_page', 15));

        return response()->json($services);
    }
}
