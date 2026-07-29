<?php

namespace App\Http\Controllers;

use App\Models\ServiceBundle;
use App\Models\Vendor;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BundleController extends Controller
{
    /** GET /api/vendors/{id}/bundles — public */
    public function index($vendor_id)
    {
        $bundles = ServiceBundle::where('vendor_id', $vendor_id)
            ->where('is_active', true)
            ->get()
            ->map(function ($b) {
                $services = Service::whereIn('id', $b->service_ids)->select('id', 'name', 'price')->get();
                return array_merge($b->toArray(), ['services' => $services]);
            });
        return response()->json(['bundles' => $bundles]);
    }

    /** GET /api/vendor/bundles — authenticated vendor */
    public function myBundles(Request $request)
    {
        $vendor = Vendor::where('user_id', $request->user()->id)->first();
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

        $bundles = ServiceBundle::where('vendor_id', $vendor->id)->get()->map(function ($b) {
            $services = Service::whereIn('id', $b->service_ids)->select('id', 'name', 'price')->get();
            return array_merge($b->toArray(), ['services' => $services]);
        });
        return response()->json(['bundles' => $bundles]);
    }

    /** POST /api/vendor/bundles */
    public function store(Request $request)
    {
        $vendor = Vendor::where('user_id', $request->user()->id)->first();
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

        if (!$vendor->canCreateBundle()) {
            $max = $vendor->getPlanLimit('max_bundles');
            return response()->json(['message' => "Your {$vendor->subscription_plan} plan allows a maximum of {$max} bundles."], 403);
        }

        $validator = Validator::make($request->all(), [
            'name'             => 'required|string|max:255',
            'description'      => 'nullable|string|max:1000',
            'service_ids'      => 'required|array|min:2',
            'service_ids.*'    => 'integer|exists:services,id',
            'bundle_price'     => 'required|numeric|min:0',
            'discount_percent' => 'nullable|integer|min:0|max:100',
        ]);
        if ($validator->fails()) return response()->json(['errors' => $validator->errors()], 422);

        // Verify all services belong to this vendor
        $count = Service::whereIn('id', $request->service_ids)->where('vendor_id', $vendor->id)->count();
        if ($count !== count($request->service_ids)) {
            return response()->json(['message' => 'All services must belong to your profile'], 422);
        }

        $bundle = ServiceBundle::create([
            'vendor_id'        => $vendor->id,
            'name'             => $request->name,
            'description'      => $request->description,
            'service_ids'      => $request->service_ids,
            'bundle_price'     => $request->bundle_price,
            'discount_percent' => $request->discount_percent ?? 0,
            'is_active'        => true,
        ]);

        return response()->json(['bundle' => $bundle, 'message' => 'Bundle created'], 201);
    }

    /** DELETE /api/vendor/bundles/{id} */
    public function destroy(Request $request, $id)
    {
        $vendor = Vendor::where('user_id', $request->user()->id)->first();
        $bundle = ServiceBundle::where('id', $id)->where('vendor_id', $vendor?->id)->first();
        if (!$bundle) return response()->json(['message' => 'Not found'], 404);
        $bundle->delete();
        return response()->json(['message' => 'Bundle deleted']);
    }

    /** PUT /api/vendor/bundles/{id}/toggle */
    public function toggle(Request $request, $id)
    {
        $vendor = Vendor::where('user_id', $request->user()->id)->first();
        $bundle = ServiceBundle::where('id', $id)->where('vendor_id', $vendor?->id)->first();
        if (!$bundle) return response()->json(['message' => 'Not found'], 404);
        $bundle->update(['is_active' => !$bundle->is_active]);
        return response()->json(['bundle' => $bundle]);
    }
}
