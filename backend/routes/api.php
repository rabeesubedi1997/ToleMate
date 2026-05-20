<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\VendorController;
use App\Http\Controllers\ReviewController;

use App\Http\Controllers\AdminController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\TranslationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\PasswordResetController;

Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::post('/user/change-password', [AuthController::class, 'changePassword']);

    // Admin routes
    Route::get('/admin/stats', [AdminController::class, 'getDashboardStats']);
    Route::get('/admin/analytics', [AdminController::class, 'getAnalytics']);
    Route::get('/admin/users', [AdminController::class, 'getUsers']);
    Route::post('/admin/users', [AdminController::class, 'createUser']);
    Route::get('/admin/users/{id}', [AdminController::class, 'getUser']);
    Route::put('/admin/users/{id}', [AdminController::class, 'updateUser']);
    Route::delete('/admin/users/{id}', [AdminController::class, 'deleteUser']);
    Route::get('/admin/services', [AdminController::class, 'getServices']);
    Route::get('/admin/reviews', [AdminController::class, 'getReviews']);
    Route::delete('/admin/reviews/{id}', [AdminController::class, 'deleteReview']);

    // Admin vendor management
    Route::get('/admin/vendors', [AdminController::class, 'getVendors']);
    Route::delete('/admin/vendors/{id}', [AdminController::class, 'deleteVendor']);
    Route::put('/admin/vendors/{id}/verify', [AdminController::class, 'verifyVendor']);
    Route::put('/admin/vendors/{id}/feature', [AdminController::class, 'featureVendor']);
    Route::post('/admin/vendors/bulk', [AdminController::class, 'bulkVendorAction']);
    Route::get('/admin/vendors/{id}/bookings', [AdminController::class, 'getVendorBookings']);
    Route::get('/admin/vendors/{id}/messages', [AdminController::class, 'getVendorMessages']);
    Route::get('/admin/vendors/{id}/services', [AdminController::class, 'getVendorServices']);
    Route::get('/admin/vendors/{id}/features', [AdminController::class, 'getVendorFeatures']);
    Route::put('/admin/vendors/{id}/features', [AdminController::class, 'updateVendorFeatures']);
    Route::get('/admin/vendors/{id}/availability', [AdminController::class, 'getVendorAvailability']);
    Route::put('/admin/vendors/{id}/availability', [AdminController::class, 'updateVendorAvailability']);

    // Admin bookings management
    Route::get('/admin/bookings', [AdminController::class, 'getAllBookings']);
    Route::put('/admin/bookings/{id}/status', [AdminController::class, 'updateBookingStatus']);

    // Admin categories management
    Route::get('/admin/categories', [AdminController::class, 'getCategories']);
    Route::post('/admin/categories', [AdminController::class, 'createCategory']);
    Route::put('/admin/categories/{id}', [AdminController::class, 'updateCategory']);
    Route::delete('/admin/categories/{id}', [AdminController::class, 'deleteCategory']);

    // Admin conversations
    Route::get('/admin/conversations', [AdminController::class, 'getAllConversations']);

    // Admin password reset (generate new password or send reset email)
    Route::post('/admin/users/{id}/reset-password', [PasswordResetController::class, 'adminResetPassword']);

    // Settings & Media routes (Admin)
    Route::post('/admin/settings', [SettingController::class, 'updateBatch']);
    Route::get('/admin/media', [MediaController::class, 'index']);
    Route::post('/admin/media', [MediaController::class, 'store']);
    Route::delete('/admin/media/{id}', [MediaController::class, 'destroy']);

    // Coupon management (Admin)
    Route::get('/admin/coupons', [\App\Http\Controllers\CouponController::class, 'index']);
    Route::post('/admin/coupons', [\App\Http\Controllers\CouponController::class, 'store']);
    Route::put('/admin/coupons/{id}', [\App\Http\Controllers\CouponController::class, 'update']);
    Route::delete('/admin/coupons/{id}', [\App\Http\Controllers\CouponController::class, 'destroy']);

    // Vendor subscription plan (Admin)
    Route::put('/admin/vendors/{id}/plan', [AdminController::class, 'updateVendorPlan']);

    // Vendor profile
    Route::get('/vendor/profile', [VendorController::class, 'profile']);
    Route::put('/vendor/profile', [VendorController::class, 'updateProfile']);
    Route::post('/vendor/avatar', [VendorController::class, 'uploadAvatar']);
    Route::get('/vendor/features', [VendorController::class, 'getFeatures']);
    Route::get('/vendor/availability', [VendorController::class, 'getAvailability']);
    Route::put('/vendor/availability', [VendorController::class, 'updateAvailability']);

    // Review routes (authenticated)
    Route::post('/reviews', [ReviewController::class, 'store']);
    Route::put('/reviews/{id}/reply', [ReviewController::class, 'vendorReply']);

    // Referral
    Route::get('/referral', [\App\Http\Controllers\ReferralController::class, 'index']);

    // Loyalty points
    Route::get('/loyalty', [\App\Http\Controllers\LoyaltyController::class, 'index']);

    // Payments
    Route::post('/payments/mock', [PaymentController::class, 'processMockPayment']);
    Route::post('/bookings/{id}/mark-cash-paid', [PaymentController::class, 'markCashPaid']);

    Route::get('/my-reviews', [ReviewController::class, 'myReviews']);

    // Service routes
    Route::post('/services', [ServiceController::class, 'store']);
    Route::put('/services/{id}', [ServiceController::class, 'update']);
    Route::delete('/services/{id}', [ServiceController::class, 'destroy']);
    Route::post('/services/{id}/image', [ServiceController::class, 'uploadImage']);
    // Service packages
    Route::post('/services/{id}/packages', [ServiceController::class, 'storePackage']);
    Route::put('/services/{id}/packages/{pkg}', [ServiceController::class, 'updatePackage']);
    Route::delete('/services/{id}/packages/{pkg}', [ServiceController::class, 'destroyPackage']);

    // Coupon apply (authenticated users)
    Route::post('/coupons/apply', [\App\Http\Controllers\CouponController::class, 'apply']);

    // Booking routes
    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/bookings/{id}', [BookingController::class, 'show']);
    Route::post('/bookings', [BookingController::class, 'store']);
    Route::put('/bookings/{id}', [BookingController::class, 'update']);
    Route::delete('/bookings/{id}', [BookingController::class, 'destroy']);
    Route::post('/bookings/{id}/reschedule', [BookingController::class, 'requestReschedule']);
    Route::post('/bookings/{id}/reschedule-respond', [BookingController::class, 'respondReschedule']);

    // Booking requests
    Route::post('/booking-requests', [BookingController::class, 'createRequest']);
    Route::get('/booking-requests', [BookingController::class, 'getRequests']);
    Route::post('/booking-requests/{id}/respond', [BookingController::class, 'respondToRequest']);

    // InDrive-style request bidding
    Route::get('/vendor/incoming-requests', [\App\Http\Controllers\RequestBidController::class, 'incomingRequests']);
    Route::post('/booking-requests/{id}/bid', [\App\Http\Controllers\RequestBidController::class, 'placeBid']);
    Route::get('/booking-requests/{id}/bids', [\App\Http\Controllers\RequestBidController::class, 'listBids']);
    Route::put('/booking-requests/{id}/bids/{bidId}/accept', [\App\Http\Controllers\RequestBidController::class, 'acceptBid']);
    Route::put('/booking-requests/{id}/bids/{bidId}/decline', [\App\Http\Controllers\RequestBidController::class, 'declineBid']);
    Route::put('/bids/{id}/withdraw', [\App\Http\Controllers\RequestBidController::class, 'withdrawBid']);

    // Message routes
    Route::get('/messages/unread-count', [MessageController::class, 'unreadCount']);
    Route::get('/messages', [MessageController::class, 'index']);
    Route::post('/messages', [MessageController::class, 'store']);
    Route::get('/conversations', [MessageController::class, 'conversations']);
    Route::get('/direct-conversations', [MessageController::class, 'directConversations']);
    Route::put('/messages/{id}/read', [MessageController::class, 'markAsRead']);
    Route::put('/messages/read', [MessageController::class, 'markAsRead']);
    Route::get('/admin-contact', function (\Illuminate\Http\Request $request) {
        $admin = \App\Models\User::where('role', 'admin')->first();
        if (!$admin) return response()->json(null, 404);
        return response()->json(['id' => $admin->id, 'name' => $admin->name]);
    });

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/{id}/unread', [NotificationController::class, 'markAsUnread']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'delete']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);

    // Phase P — Portfolio (vendor-owned)
    Route::post('/vendor/portfolio', [\App\Http\Controllers\PortfolioController::class, 'store']);
    Route::delete('/vendor/portfolio/{id}', [\App\Http\Controllers\PortfolioController::class, 'destroy']);

    // Phase P — Service Bundles (vendor-owned)
    Route::get('/vendor/bundles', [\App\Http\Controllers\BundleController::class, 'myBundles']);
    Route::post('/vendor/bundles', [\App\Http\Controllers\BundleController::class, 'store']);
    Route::delete('/vendor/bundles/{id}', [\App\Http\Controllers\BundleController::class, 'destroy']);
    Route::put('/vendor/bundles/{id}/toggle', [\App\Http\Controllers\BundleController::class, 'toggle']);
});

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// SSE stream — auth handled manually inside controller (EventSource can't send headers)
Route::get('/messages/stream', [MessageController::class, 'streamMessages']);

// Global event stream — one SSE connection per user replaces all client-side polling.
// Token passed as query param because EventSource API cannot set Authorization headers.
Route::get('/events', [\App\Http\Controllers\EventStreamController::class, 'stream'])
    ->middleware('auth.token_query', 'auth:sanctum');

// Password reset (public — no auth required)
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink']);
Route::post('/reset-password',  [PasswordResetController::class, 'resetPassword']);

// Category route (public — needed for service search filters)
Route::get('/categories', function () {
    return response()->json(\App\Models\Category::withCount(['services' => fn($q) => $q->where('is_active', true)])->orderBy('name')->get());
});

// Service routes (public)
Route::get('/services/search', [ServiceController::class, 'search']);
Route::get('/services', [ServiceController::class, 'index']);
Route::get('/services/{id}', [ServiceController::class, 'show']);

// Review routes (public)
Route::get('/vendors/{id}/reviews', [ReviewController::class, 'index']);
Route::get('/featured-vendors', [VendorController::class, 'featured']);

// Vendor public profile (public)
Route::get('/vendors/{id}/availability', [VendorController::class, 'publicAvailability']);
Route::get('/vendors/{id}/portfolio', [\App\Http\Controllers\PortfolioController::class, 'index']);
Route::get('/vendors/{id}/bundles', [\App\Http\Controllers\BundleController::class, 'index']);
Route::get('/vendors/{id}/services', [ServiceController::class, 'vendorServices']);
Route::get('/vendors/{id}', [VendorController::class, 'show']);
Route::get('/vendors', [VendorController::class, 'index']);

// Settings route (public)
Route::get('/settings', [SettingController::class, 'index']);

Route::get('/translations', [TranslationController::class, 'index']);
Route::post('/translations', [TranslationController::class, 'store'])->middleware('auth:sanctum');
Route::get('/categories', function () {
    return \App\Models\Category::all();
});
