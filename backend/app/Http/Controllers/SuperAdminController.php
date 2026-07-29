<?php

namespace App\Http\Controllers;

use App\Models\ActivityLog;
use App\Models\Notification;
use App\Models\Service;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SuperAdminController extends Controller
{
    // ── Service Moderation ─────────────────────────────────────────────────

    public function getPendingServices(Request $request)
    {
        $services = Service::with(['category', 'vendor.user'])
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json($services);
    }

    public function getServiceModerationQueue(Request $request)
    {
        $query = Service::with(['category', 'vendor.user']);

        if ($request->status && in_array($request->status, ['pending', 'approved', 'rejected', 'draft'])) {
            $query->where('status', $request->status);
        }

        $services = $query->orderBy('created_at', 'desc')->paginate(20);

        return response()->json($services);
    }

    public function approveService(Request $request, $id)
    {
        $service = Service::find($id);
        if (!$service) {
            return response()->json(['message' => 'Service not found'], 404);
        }

        $oldStatus = $service->status;

        $service->status = 'approved';
        $service->is_active = true;
        $service->reviewed_by = $request->user()->id;
        $service->reviewed_at = now();
        $service->rejection_reason = null;
        $service->save();

        ActivityLog::log($request->user()->id, 'service.approved', $service, ['status' => $oldStatus], ['status' => 'approved']);

        NotificationController::sendNotification(
            $service->vendor->user_id,
            'system',
            'Service Approved',
            "Your service \"{$service->name}\" has been approved and is now live.",
            ['service_id' => $service->id, 'type' => 'service_approved']
        );

        return response()->json(['message' => 'Service approved', 'service' => $service]);
    }

    public function rejectService(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string|max:1000']);

        $service = Service::find($id);
        if (!$service) {
            return response()->json(['message' => 'Service not found'], 404);
        }

        $oldStatus = $service->status;

        $service->status = 'rejected';
        $service->is_active = false;
        $service->reviewed_by = $request->user()->id;
        $service->reviewed_at = now();
        $service->rejection_reason = $request->reason;
        $service->save();

        ActivityLog::log($request->user()->id, 'service.rejected', $service, ['status' => $oldStatus], ['status' => 'rejected', 'reason' => $request->reason]);

        NotificationController::sendNotification(
            $service->vendor->user_id,
            'system',
            'Service Rejected',
            "Your service \"{$service->name}\" was rejected. Reason: {$request->reason}",
            ['service_id' => $service->id, 'type' => 'service_rejected']
        );

        return response()->json(['message' => 'Service rejected', 'service' => $service]);
    }

    public function bulkApproveServices(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
        ]);

        $count = Service::whereIn('id', $request->ids)
            ->where('status', 'pending')
            ->update([
                'status' => 'approved',
                'is_active' => true,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => null,
            ]);

        return response()->json(['message' => "$count service(s) approved"]);
    }

    public function bulkRejectServices(Request $request)
    {
        $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer',
            'reason' => 'required|string|max:1000',
        ]);

        $count = Service::whereIn('id', $request->ids)
            ->where('status', 'pending')
            ->update([
                'status' => 'rejected',
                'is_active' => false,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => $request->reason,
            ]);

        return response()->json(["message" => "$count service(s) rejected"]);
    }

    // ── Admin Management ───────────────────────────────────────────────────

    public function getAdmins(Request $request)
    {
        $admins = User::whereIn('role', ['admin', 'super_admin'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($admins);
    }

    public function createAdmin(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,super_admin',
            'phone' => 'nullable|string|max:20',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'phone' => $request->phone,
        ]);

        ActivityLog::log($request->user()->id, 'admin.created', $user, null, ['role' => $request->role]);

        return response()->json(['message' => 'Admin created', 'user' => $user], 201);
    }

    public function deleteAdmin(Request $request, $id)
    {
        $admin = User::find($id);
        if (!$admin || !in_array($admin->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Admin not found'], 404);
        }

        if ($admin->role === 'super_admin') {
            return response()->json(['message' => 'Super admin accounts cannot be deleted'], 403);
        }

        if ($admin->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot delete your own account'], 400);
        }

        $admin->delete();

        ActivityLog::log($request->user()->id, 'admin.deleted', $admin, null, null);

        return response()->json(['message' => 'Admin deleted']);
    }

    public function suspendAdmin(Request $request, $id)
    {
        $admin = User::find($id);
        if (!$admin || !in_array($admin->role, ['admin', 'super_admin'])) {
            return response()->json(['message' => 'Admin not found'], 404);
        }

        if ($admin->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot suspend your own account'], 400);
        }

        $admin->update(['is_active' => !$admin->is_active]);

        $status = $admin->is_active ? 'activated' : 'suspended';
        ActivityLog::log($request->user()->id, "admin.$status", $admin, null, ['is_active' => $admin->is_active]);

        return response()->json(['message' => "Admin $status", 'user' => $admin]);
    }

    // ── Platform Oversight ─────────────────────────────────────────────────

    public function getActivityLogs(Request $request)
    {
        $logs = ActivityLog::with('user')
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json($logs);
    }

    public function getPlatformOverview(Request $request)
    {
        return response()->json([
            'total_users' => User::count(),
            'total_vendors' => Vendor::count(),
            'total_admins' => User::whereIn('role', ['admin', 'super_admin'])->count(),
            'pending_services' => Service::where('status', 'pending')->count(),
            'rejected_services' => Service::where('status', 'rejected')->count(),
            'total_services' => Service::count(),
            'active_services' => Service::where('is_active', true)->count(),
        ]);
    }

    public function changeUserRole(Request $request, $id)
    {
        $request->validate([
            'role' => 'required|in:customer,vendor,admin,super_admin',
        ]);

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Cannot change your own role'], 400);
        }

        $oldRole = $user->role;
        $user->update(['role' => $request->role]);

        ActivityLog::log($request->user()->id, 'user.role_changed', $user, ['role' => $oldRole], ['role' => $request->role]);

        return response()->json(['message' => 'Role updated', 'user' => $user]);
    }
}
