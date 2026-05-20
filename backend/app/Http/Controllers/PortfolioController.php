<?php

namespace App\Http\Controllers;

use App\Models\VendorPortfolio;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PortfolioController extends Controller
{
    /** GET /api/vendors/{id}/portfolio — public */
    public function index($vendor_id)
    {
        $items = VendorPortfolio::where('vendor_id', $vendor_id)
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get();
        return response()->json(['portfolio' => $items]);
    }

    /** POST /api/vendor/portfolio — authenticated vendor uploads a portfolio item */
    public function store(Request $request)
    {
        $user = $request->user();
        $vendor = Vendor::where('user_id', $user->id)->first();
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

        $request->validate([
            'image'        => 'required|image|max:4096',
            'before_image' => 'nullable|image|max:4096',
            'caption'      => 'nullable|string|max:200',
        ]);

        $imageUrl = '/storage/' . $request->file('image')->store('portfolio', 'public');
        $beforeUrl = null;
        if ($request->hasFile('before_image')) {
            $beforeUrl = '/storage/' . $request->file('before_image')->store('portfolio', 'public');
        }

        $count = VendorPortfolio::where('vendor_id', $vendor->id)->count();
        $item = VendorPortfolio::create([
            'vendor_id'       => $vendor->id,
            'image_url'       => $imageUrl,
            'before_image_url' => $beforeUrl,
            'caption'         => $request->caption,
            'sort_order'      => $count,
        ]);

        return response()->json(['item' => $item, 'message' => 'Portfolio item added'], 201);
    }

    /** DELETE /api/vendor/portfolio/{id} — authenticated vendor */
    public function destroy(Request $request, $id)
    {
        $user = $request->user();
        $vendor = Vendor::where('user_id', $user->id)->first();
        if (!$vendor) return response()->json(['message' => 'Vendor not found'], 404);

        $item = VendorPortfolio::where('id', $id)->where('vendor_id', $vendor->id)->first();
        if (!$item) return response()->json(['message' => 'Not found'], 404);

        // Remove files from storage
        foreach ([$item->image_url, $item->before_image_url] as $path) {
            if ($path) Storage::disk('public')->delete(str_replace('/storage/', '', $path));
        }
        $item->delete();

        return response()->json(['message' => 'Deleted']);
    }
}
