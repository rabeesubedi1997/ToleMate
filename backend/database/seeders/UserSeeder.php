<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Vendor;
use App\Models\Category;
use App\Models\Service;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create admin user
        User::create([
            'name' => 'Admin User',
            'email' => 'admin@tolemate.com',
            'password' => Hash::make('password'),
            'role' => 'admin',
            'preferred_language' => 'en',
        ]);

        // Create sample vendors
        $vendors = [
            [
                'name' => 'John Smith',
                'email' => 'john@homeservices.com',
                'business_name' => 'Professional Home Repair',
                'description' => 'Expert home repair and maintenance services with over 10 years of experience.',
                'phone' => '+977123456789',
                'rating' => 4.8,
                'service_area_radius' => 25,
            ],
            [
                'name' => 'Sarah Johnson',
                'email' => 'sarah@cleanservices.com',
                'business_name' => 'Sparkling Clean Services',
                'description' => 'Professional cleaning services for homes and offices.',
                'phone' => '+977987654321',
                'rating' => 4.9,
                'service_area_radius' => 20,
            ],
            [
                'name' => 'Mike Wilson',
                'email' => 'mike@electrical.com',
                'business_name' => 'Wilson Electrical Solutions',
                'description' => 'Licensed electrical contractor for all your electrical needs.',
                'phone' => '+977112233445',
                'rating' => 4.7,
                'service_area_radius' => 30,
            ],
            [
                'name' => 'Lisa Chen',
                'email' => 'lisa@plumbing.com',
                'business_name' => 'Quick Fix Plumbing',
                'description' => 'Fast and reliable plumbing services available 24/7.',
                'phone' => '+977554433221',
                'rating' => 4.6,
                'service_area_radius' => 15,
            ],
        ];

        foreach ($vendors as $vendorData) {
            $user = User::create([
                'name' => $vendorData['name'],
                'email' => $vendorData['email'],
                'password' => Hash::make('password'),
                'phone' => $vendorData['phone'],
                'role' => 'vendor',
                'preferred_language' => 'en',
                'lat' => 27.7172 + (rand(-5, 5) / 100),
                'lng' => 85.3240 + (rand(-5, 5) / 100),
            ]);

            Vendor::create([
                'user_id' => $user->id,
                'business_name' => $vendorData['business_name'],
                'description' => $vendorData['description'],
                'rating' => $vendorData['rating'],
                'service_area_radius' => $vendorData['service_area_radius'],
            ]);
        }

        // Create sample customers
        $customers = [
            [
                'name' => 'David Brown',
                'email' => 'david@email.com',
                'phone' => '+977123456788',
            ],
            [
                'name' => 'Emma Davis',
                'email' => 'emma@email.com',
                'phone' => '+977987654322',
            ],
            [
                'name' => 'Robert Miller',
                'email' => 'robert@email.com',
                'phone' => '+977112233446',
            ],
            [
                'name' => 'Jennifer Lee',
                'email' => 'jennifer@email.com',
                'phone' => '+977554433222',
            ],
        ];

        foreach ($customers as $customerData) {
            User::create([
                'name' => $customerData['name'],
                'email' => $customerData['email'],
                'password' => Hash::make('password'),
                'phone' => $customerData['phone'],
                'role' => 'customer',
                'preferred_language' => 'en',
                'lat' => 27.7172 + (rand(-5, 5) / 100),
                'lng' => 85.3240 + (rand(-5, 5) / 100),
            ]);
        }

        // Create categories
        $categories = [
            ['name' => 'Home Repair'],
            ['name' => 'Cleaning'],
            ['name' => 'Electrical'],
            ['name' => 'Plumbing'],
            ['name' => 'Painting'],
            ['name' => 'Gardening'],
            ['name' => 'Appliance Repair'],
            ['name' => 'Moving Services'],
        ];

        foreach ($categories as $categoryData) {
            Category::create($categoryData);
        }

        // Create sample services
        $services = [
            [
                'vendor_id' => 1,
                'category_id' => 1,
                'name' => 'General Home Repair',
                'description' => 'Professional home repair services for all types of household issues.',
                'pricing_type' => 'hourly',
                'price' => 45.00,
                'tags' => ['repair', 'maintenance', 'handyman'],
            ],
            [
                'vendor_id' => 1,
                'category_id' => 1,
                'name' => 'Door and Window Repair',
                'description' => 'Expert repair and replacement of doors and windows.',
                'pricing_type' => 'fixed',
                'price' => 150.00,
                'tags' => ['doors', 'windows', 'repair'],
            ],
            [
                'vendor_id' => 2,
                'category_id' => 2,
                'name' => 'Deep House Cleaning',
                'description' => 'Comprehensive deep cleaning service for your entire home.',
                'pricing_type' => 'fixed',
                'price' => 200.00,
                'tags' => ['cleaning', 'deep clean', 'house'],
            ],
            [
                'vendor_id' => 2,
                'category_id' => 2,
                'name' => 'Office Cleaning',
                'description' => 'Professional cleaning services for offices and commercial spaces.',
                'pricing_type' => 'hourly',
                'price' => 35.00,
                'tags' => ['office', 'commercial', 'cleaning'],
            ],
            [
                'vendor_id' => 3,
                'category_id' => 3,
                'name' => 'Electrical Installation',
                'description' => 'Safe and professional electrical installation services.',
                'pricing_type' => 'quote',
                'price' => null,
                'tags' => ['installation', 'electrical', 'wiring'],
            ],
            [
                'vendor_id' => 3,
                'category_id' => 3,
                'name' => 'Electrical Repair',
                'description' => 'Fast and reliable electrical repair services.',
                'pricing_type' => 'hourly',
                'price' => 60.00,
                'tags' => ['repair', 'electrical', 'troubleshooting'],
            ],
            [
                'vendor_id' => 4,
                'category_id' => 4,
                'name' => 'Pipe Repair and Installation',
                'description' => 'Professional plumbing services for pipe repair and installation.',
                'pricing_type' => 'hourly',
                'price' => 55.00,
                'tags' => ['plumbing', 'pipes', 'installation'],
            ],
            [
                'vendor_id' => 4,
                'category_id' => 4,
                'name' => 'Emergency Plumbing',
                'description' => '24/7 emergency plumbing services for urgent issues.',
                'pricing_type' => 'fixed',
                'price' => 250.00,
                'tags' => ['emergency', 'plumbing', '24/7'],
            ],
        ];

        foreach ($services as $serviceData) {
            Service::create($serviceData);
        }
    }
}
