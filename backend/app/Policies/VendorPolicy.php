<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Vendor;

class VendorPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    public function view(User $user, Vendor $vendor): bool
    {
        if (in_array($user->role, ['admin', 'super_admin'])) return true;
        return $user->vendor && $user->vendor->id === $vendor->id;
    }

    public function create(User $user): bool
    {
        return $user->role === 'super_admin';
    }

    public function update(User $user, Vendor $vendor): bool
    {
        if ($user->role === 'super_admin') return true;
        return $user->vendor && $user->vendor->id === $vendor->id;
    }

    public function delete(User $user, Vendor $vendor): bool
    {
        return $user->role === 'super_admin';
    }

    public function verify(User $user): bool
    {
        return $user->role === 'super_admin';
    }

    public function feature(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }
}
