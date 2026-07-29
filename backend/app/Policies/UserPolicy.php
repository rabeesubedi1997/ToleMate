<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    public function view(User $user, User $target): bool
    {
        if ($user->role === 'super_admin') return true;
        if ($user->role === 'admin') return $target->role !== 'super_admin';
        return $user->id === $target->id;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'super_admin']);
    }

    public function update(User $user, User $target): bool
    {
        if ($user->role === 'super_admin') return true;
        if ($user->role === 'admin') {
            return $target->role !== 'super_admin' && $target->role !== 'admin';
        }
        return $user->id === $target->id;
    }

    public function delete(User $user, User $target): bool
    {
        if ($user->role === 'super_admin') return true;
        if ($user->role === 'admin') return $target->role === 'customer';
        return false;
    }

    public function changeRole(User $user): bool
    {
        return $user->role === 'super_admin';
    }
}
