<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class MenuSeeder extends Seeder
{
    public function run(): void
    {
        $menus = [
            ['label' => 'Home',     'path' => '/',         'order' => 1,  'role' => null, 'is_active' => true],
            ['label' => 'Services', 'path' => '/services', 'order' => 2,  'role' => null, 'is_active' => true],
            ['label' => 'Dashboard','path' => '/dashboard',  'order' => 3,  'role' => 'customer', 'is_active' => true],
            ['label' => 'Dashboard','path' => '/vendor-dashboard', 'order' => 3,  'role' => 'vendor', 'is_active' => true],
            ['label' => 'Admin',    'path' => '/admin-dashboard',  'order' => 3,  'role' => 'admin', 'is_active' => true],
            ['label' => 'Favorites','path' => '/favorites', 'order' => 4,  'role' => 'customer', 'is_active' => true],
            ['label' => 'Messages', 'path' => '/messages',  'order' => 5,  'role' => null, 'is_active' => true],
            ['label' => 'Marketplace','path' => '/marketplace','order' => 6, 'role' => 'vendor', 'is_active' => true],
        ];

        foreach ($menus as $menu) {
            DB::table('menus')->updateOrInsert(
                ['label' => $menu['label'], 'path' => $menu['path'], 'role' => $menu['role']],
                $menu
            );
        }
    }
}
