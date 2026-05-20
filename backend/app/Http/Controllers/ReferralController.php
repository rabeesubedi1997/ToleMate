<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class ReferralController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $referralCount = \App\Models\User::where('referred_by', $user->id)->count();
        $referredUsers = \App\Models\User::where('referred_by', $user->id)
            ->select('id', 'name', 'created_at')
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'referral_code' => $user->referral_code,
            'referral_count' => $referralCount,
            'referred_users' => $referredUsers,
            'share_url' => config('app.url') . '/register?ref=' . $user->referral_code,
        ]);
    }
}
