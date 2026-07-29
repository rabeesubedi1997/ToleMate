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
use App\Http\Controllers\SuperAdminController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\CommissionController;
use App\Http\Controllers\DisputeController;
use App\Http\Controllers\MenuController;
use App\Http\Controllers\PageSeoController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\TranslationController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\KhaltiPaymentController;
use App\Http\Controllers\PasswordResetController;

Route::middleware('auth:sanctum')->group(function () {
    // Auth routes
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::post('/user/change-password', [AuthController::class, 'changePassword']);

    // ── Admin routes (role: admin, super_admin via middleware in controller) ──
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

    // Admin vendor management (read-only for admin; writes are super_admin only)
    Route::get('/admin/vendors', [AdminController::class, 'getVendors']);
    Route::get('/admin/vendors/{id}/bookings', [AdminController::class, 'getVendorBookings']);
    Route::get('/admin/vendors/{id}/messages', [AdminController::class, 'getVendorMessages']);
    Route::get('/admin/vendors/{id}/services', [AdminController::class, 'getVendorServices']);
    Route::get('/admin/vendors/{id}/features', [AdminController::class, 'getVendorFeatures']);
    Route::get('/admin/vendors/{id}/availability', [AdminController::class, 'getVendorAvailability']);

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

    // Admin password reset
    Route::post('/admin/users/{id}/reset-password', [PasswordResetController::class, 'adminResetPassword']);

    // Settings & Media routes (admin/super_admin via middleware in controller)
    Route::middleware('role:admin,super_admin')->group(function () {
        Route::post('/admin/settings', [SettingController::class, 'updateBatch']);
        Route::get('/admin/media', [MediaController::class, 'index']);
        Route::post('/admin/media', [MediaController::class, 'store']);
        Route::delete('/admin/media/{id}', [MediaController::class, 'destroy']);

        // Coupon management
        Route::get('/admin/coupons', [\App\Http\Controllers\CouponController::class, 'index']);
        Route::post('/admin/coupons', [\App\Http\Controllers\CouponController::class, 'store']);
        Route::put('/admin/coupons/{id}', [\App\Http\Controllers\CouponController::class, 'update']);
        Route::delete('/admin/coupons/{id}', [\App\Http\Controllers\CouponController::class, 'destroy']);

        // Translation management
        Route::post('/translations', [TranslationController::class, 'store']);

        // Menu management
        Route::get('/admin/menus', [MenuController::class, 'all']);
        Route::post('/admin/menus', [MenuController::class, 'store']);
        Route::put('/admin/menus/{id}', [MenuController::class, 'update']);
        Route::delete('/admin/menus/{id}', [MenuController::class, 'destroy']);

        // Page SEO management
        Route::get('/admin/page-seo', [PageSeoController::class, 'index']);
        Route::post('/admin/page-seo', [PageSeoController::class, 'store']);
        Route::put('/admin/page-seo/{id}', [PageSeoController::class, 'update']);
        Route::delete('/admin/page-seo/{id}', [PageSeoController::class, 'destroy']);
    });

    // ── Super Admin only routes ──────────────────────────────────────────────
    Route::middleware('role:super_admin')->prefix('super-admin')->group(function () {
        // Dashboard
        Route::get('/overview', [SuperAdminController::class, 'getPlatformOverview']);
        Route::get('/activity-logs', [SuperAdminController::class, 'getActivityLogs']);

        // Service moderation
        Route::get('/services/pending', [SuperAdminController::class, 'getPendingServices']);
        Route::get('/services/moderation', [SuperAdminController::class, 'getServiceModerationQueue']);
        Route::post('/services/{id}/approve', [SuperAdminController::class, 'approveService']);
        Route::post('/services/{id}/reject', [SuperAdminController::class, 'rejectService']);
        Route::post('/services/bulk-approve', [SuperAdminController::class, 'bulkApproveServices']);
        Route::post('/services/bulk-reject', [SuperAdminController::class, 'bulkRejectServices']);

        // Admin management
        Route::get('/admins', [SuperAdminController::class, 'getAdmins']);
        Route::post('/admins', [SuperAdminController::class, 'createAdmin']);
        Route::delete('/admins/{id}', [SuperAdminController::class, 'deleteAdmin']);
        Route::put('/admins/{id}/suspend', [SuperAdminController::class, 'suspendAdmin']);

        // User role management
        Route::put('/users/{id}/role', [SuperAdminController::class, 'changeUserRole']);

        // Commission management
        Route::get('/commissions', [CommissionController::class, 'index']);
        Route::get('/commissions/stats', [CommissionController::class, 'stats']);
        Route::put('/commissions/{id}/pay', [CommissionController::class, 'markAsPaid']);
        Route::post('/commissions/rate', [CommissionController::class, 'updateRate']);

        // KYC / Document review
        Route::get('/kyc/pending', [AdminController::class, 'getKycPending']);
        Route::post('/kyc/documents/{id}/approve', [AdminController::class, 'approveKycDocument']);
        Route::post('/kyc/documents/{id}/reject', [AdminController::class, 'rejectKycDocument']);

        // Vendor management (write operations)
        Route::delete('/vendors/{id}', [AdminController::class, 'deleteVendor']);
        Route::put('/vendors/{id}/verify', [AdminController::class, 'verifyVendor']);
        Route::put('/vendors/{id}/feature', [AdminController::class, 'featureVendor']);
        Route::post('/vendors/bulk', [AdminController::class, 'bulkVendorAction']);
        Route::put('/vendors/{id}/plan', [AdminController::class, 'updateVendorPlan']);
        Route::put('/vendors/{id}/features', [AdminController::class, 'updateVendorFeatures']);
        Route::put('/vendors/{id}/availability', [AdminController::class, 'updateVendorAvailability']);
    });

    // Vendor profile
    Route::get('/vendor/profile', [VendorController::class, 'profile']);
    Route::put('/vendor/profile', [VendorController::class, 'updateProfile']);
    Route::post('/vendor/avatar', [VendorController::class, 'uploadAvatar']);
    Route::get('/vendor/features', [VendorController::class, 'getFeatures']);
    Route::get('/vendor/availability', [VendorController::class, 'getAvailability']);
    Route::put('/vendor/availability', [VendorController::class, 'updateAvailability']);

    // Vendor analytics
    Route::get('/vendor/analytics', [VendorController::class, 'analytics']);

    // Vendor KYC
    Route::post('/vendor/documents', [VendorController::class, 'uploadDocument']);
    Route::get('/vendor/documents', [VendorController::class, 'getDocuments']);
    Route::delete('/vendor/documents/{id}', [VendorController::class, 'deleteDocument']);
    Route::get('/vendor/kyc-status', [VendorController::class, 'getKycStatus']);

    // Review routes (authenticated)
    Route::post('/reviews', [ReviewController::class, 'store']);
    Route::put('/reviews/{id}/reply', [ReviewController::class, 'vendorReply']);

    // Referral
    Route::get('/referral', [\App\Http\Controllers\ReferralController::class, 'index']);

    // Loyalty points
    Route::get('/loyalty', [\App\Http\Controllers\LoyaltyController::class, 'index']);

    // Payments
    Route::post('/payments/mock', [PaymentController::class, 'processMockPayment']);
    Route::post('/payments/khalti/verify', [KhaltiPaymentController::class, 'verify']);

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

    // Get phone number for a vendor/admin (for WhatsApp contact)
    Route::get('/users/{id}/phone', function (\Illuminate\Http\Request $request, $id) {
        $target = \App\Models\User::select('id', 'role', 'phone')->find($id);
        if (!$target || !in_array($target->role, ['vendor', 'admin'])) {
            return response()->json(null, 404);
        }
        return response()->json(['phone' => $target->phone]);
    });

    // Notification routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::put('/notifications/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::put('/notifications/{id}/unread', [NotificationController::class, 'markAsUnread']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'delete']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);

    // Disputes
    Route::get('/disputes', [DisputeController::class, 'index']);
    Route::post('/disputes', [DisputeController::class, 'store']);
    Route::get('/disputes/{id}', [DisputeController::class, 'show']);
    Route::post('/disputes/{id}/resolve', [DisputeController::class, 'resolve']);

    // Phase P — Portfolio (vendor-owned)
    Route::post('/vendor/portfolio', [\App\Http\Controllers\PortfolioController::class, 'store']);
    Route::delete('/vendor/portfolio/{id}', [\App\Http\Controllers\PortfolioController::class, 'destroy']);

    // Phase P — Service Bundles (vendor-owned)
    Route::get('/vendor/bundles', [\App\Http\Controllers\BundleController::class, 'myBundles']);
    Route::post('/vendor/bundles', [\App\Http\Controllers\BundleController::class, 'store']);
    Route::delete('/vendor/bundles/{id}', [\App\Http\Controllers\BundleController::class, 'destroy']);
    Route::put('/vendor/bundles/{id}/toggle', [\App\Http\Controllers\BundleController::class, 'toggle']);
});

// Public routes (with rate limiting)
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth');

// SSE stream — auth handled manually inside controller (EventSource can't send headers)
Route::get('/messages/stream', [MessageController::class, 'streamMessages']);

// Global event stream — one SSE connection per user replaces all client-side polling.
// Token passed as query param because EventSource API cannot set Authorization headers.
Route::get('/events', [\App\Http\Controllers\EventStreamController::class, 'stream'])
    ->middleware('auth.token_query', 'auth:sanctum');

// Password reset (public — no auth required, rate limited)
Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink'])->middleware('throttle:auth');
Route::post('/reset-password',  [PasswordResetController::class, 'resetPassword'])->middleware('throttle:auth');

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

// Menus (public — returns active menus for current role)
Route::get('/menus', [MenuController::class, 'index']);

// Page SEO (public — single page lookup)
Route::get('/page-seo/{page}', [PageSeoController::class, 'show']);

Route::get('/translations', [TranslationController::class, 'index']);
Route::post('/translations', [TranslationController::class, 'store'])->middleware('auth:sanctum');
