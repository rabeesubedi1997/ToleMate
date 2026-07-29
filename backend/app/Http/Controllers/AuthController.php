<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Models\User;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'phone' => 'nullable|string|max:20',
            'role' => 'sometimes|in:customer,vendor',
            'lat' => 'nullable|numeric|between:-90,90',
            'lng' => 'nullable|numeric|between:-180,180',
            'preferred_language' => 'sometimes|in:en,np',
            'referral_code' => 'nullable|string|max:10',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Generate unique referral code
        $referralCode = null;
        do {
            $referralCode = strtoupper(substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6));
        } while (\App\Models\User::where('referral_code', $referralCode)->exists());

        // Handle referral tracking
        $referredBy = null;
        if ($request->referral_code) {
            $referrer = \App\Models\User::where('referral_code', strtoupper(trim($request->referral_code)))->first();
            if ($referrer) $referredBy = $referrer->id;
        }

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone' => $request->phone,
            'role' => $request->role ?? 'customer',
            'lat' => $request->lat,
            'lng' => $request->lng,
            'preferred_language' => $request->preferred_language ?? 'en',
            'referral_code' => $referralCode,
            'referred_by' => $referredBy,
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        if ($user->role === 'vendor') {
            \App\Models\Vendor::create([
                'user_id' => $user->id,
                'business_name' => $user->name . '\'s Business',
                'description' => 'New vendor on ToleMate',
                'rating' => 0.0,
                'service_area_radius' => 10,
            ]);
        }

        return response()->json([
            'user' => $user,
            'access_token' => $token,
            'message' => 'User registered successfully'
        ], 201);
    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email',
            'password' => 'required',
            'device_token' => 'nullable|string',
            'biometric_enabled' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!Auth::attempt($request->only('email', 'password'))) {
            return response()->json(['message' => 'Invalid credentials'], 401);
        }

        $user = Auth::user();

        if ($request->device_token) {
            $user->device_token = $request->device_token;
        }
        if ($request->has('biometric_enabled')) {
            $user->biometric_enabled = $request->biometric_enabled;
        }
        $user->save();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'access_token' => $token,
            'message' => 'Login successful'
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function user(Request $request)
    {
        return response()->json($request->user());
    }

    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'phone' => 'sometimes|required|string|max:20',
            'address' => 'sometimes|nullable|string|max:500',
            'lat' => 'sometimes|numeric|between:-90,90',
            'lng' => 'sometimes|numeric|between:-180,180',
            'preferred_language' => 'sometimes|in:en,np',
            'device_token' => 'sometimes|string',
            'biometric_enabled' => 'sometimes|boolean',
            'sms_notifications' => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user->update($request->only([
            'name',
            'phone',
            'address',
            'lat',
            'lng',
            'preferred_language',
            'device_token',
            'biometric_enabled',
            'sms_notifications',
        ]));

        return response()->json([
            'user' => $user,
            'message' => 'Profile updated successfully'
        ]);
    }

    public function changePassword(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'new_password'     => 'required|string|min:8|confirmed',
        ]);
        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if (!\Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'Current password is incorrect'], 422);
        }

        $user->update(['password' => \Hash::make($request->new_password)]);

        return response()->json(['message' => 'Password changed successfully']);
    }
}
