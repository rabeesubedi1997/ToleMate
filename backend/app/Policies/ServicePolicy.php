<?php

namespace App\Policies;

use App\Models\Service;
use App\Models\User;

class ServicePolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    public function view(User $user, Service $service): bool
    {
        if (in_array($user->role, ['admin', 'super_admin'])) return true;
        return $user->vendor && $user->vendor->id === $service->vendor_id;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['vendor', 'admin', 'super_admin']);
    }

    public function update(User $user, Service $service): bool
    {
        if (in_array($user->role, ['super_admin'])) return true;
        if ($user->role === 'admin') return false;
        return $user->vendor && $user->vendor->id === $service->vendor_id;
    }

    public function delete(User $user, Service $service): bool
    {
        if ($user->role === 'super_admin') return true;
        if ($user->role === 'admin') return false;
        return $user->vendor && $user->vendor->id === $service->vendor_id;
    }

    public function approve(User $user): bool
    {
        return $user->role === 'super_admin';
    }

    public function reject(User $user): bool
    {
        return $user->role === 'super_admin';
    }
}
