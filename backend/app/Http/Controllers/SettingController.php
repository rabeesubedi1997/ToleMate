<?php

namespace App\Http\Controllers;

use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class SettingController extends Controller
{
    /**
     * Get all public settings for the frontend CMS.
     * Falls back to sensible defaults when nothing is configured yet,
     * so the banner/hero never renders blank on a fresh install.
     */
    public function index()
    {
        $settings = Setting::all()->pluck('value', 'key');

        $defaults = [
            'site_name' => 'ToleMate',
            'hero_title' => "Book Home Service Providers\nat Your Fingertips",
            'hero_subtitle' => 'Search, compare and match with verified professionals of your choice in 60 seconds.',
            'slider_interval' => '5000',
            'slider_images' => json_encode([
                ['url' => 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1200&q=80', 'title' => 'Professional Home Repair Services', 'link' => '/services', 'enabled' => true],
                ['url' => 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=1200&q=80', 'title' => 'Trusted Cleaning Professionals', 'link' => '/services', 'enabled' => true],
                ['url' => 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80', 'title' => 'Expert Tech Support at Your Door', 'link' => '/services', 'enabled' => true],
                ['url' => 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200&q=80', 'title' => 'Perfect Events, Every Time', 'link' => '/services', 'enabled' => true],
            ]),
        ];

        // Saved DB values take precedence over defaults; defaults only fill gaps.
        $merged = $defaults;
        foreach ($settings as $key => $value) {
            $merged[$key] = $value;
        }

        return response()->json($merged);
    }

    /**
     * Update or create multiple settings at once (Admin only)
     */
    public function updateBatch(Request $request)
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validator = Validator::make($request->all(), [
            'settings' => 'required|array',
            'settings.*.key' => 'required|string',
            'settings.*.value' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        foreach ($request->settings as $setting) {
            Setting::updateOrCreate(
                ['key' => $setting['key']],
                ['value' => $setting['value']]
            );
        }

        return response()->json([
            'message' => 'Settings updated successfully',
            'settings' => Setting::all()->pluck('value', 'key')
        ]);
    }
}
