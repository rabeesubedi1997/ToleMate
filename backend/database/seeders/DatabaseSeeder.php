<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Vendor;
use App\Models\Category;
use App\Models\Service;
use App\Models\ServiceImage;
use App\Models\Booking;
use App\Models\Review;
use App\Models\Message;
use App\Models\Notification;
use App\Models\Setting;
use App\Models\VendorAvailability;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // ── 1. ADMIN ────────────────────────────────────────────────
        $admin = User::create([
            'name'     => 'Admin ToleMate',
            'email'    => 'admin@tolemate.com',
            'password' => Hash::make('Admin@1234'),
            'phone'    => '+977-9800000001',
            'address'  => 'New Baneshwor, Kathmandu 44600',
            'role'     => 'admin',
            'lat'      => 27.6814,
            'lng'      => 85.3358,
            'email_verified_at' => now(),
        ]);

        // ── 2. CATEGORIES ────────────────────────────────────────────
        $categories = [
            ['name' => 'Cleaning',      'parent_id' => null],
            ['name' => 'Plumbing',      'parent_id' => null],
            ['name' => 'Electrical',    'parent_id' => null],
            ['name' => 'Gardening',     'parent_id' => null],
            ['name' => 'Painting',      'parent_id' => null],
            ['name' => 'Pest Control',  'parent_id' => null],
            ['name' => 'Moving',        'parent_id' => null],
            ['name' => 'IT Support',    'parent_id' => null],
        ];
        $catModels = [];
        foreach ($categories as $cat) {
            $catModels[] = Category::create($cat);
        }

        // ── 3. VENDOR USERS + PROFILES ───────────────────────────────
        $vendorData = [
            [
                'user' => [
                    'name'    => 'Ram Cleaning Services',
                    'email'   => 'john@vendor.com',
                    'password'=> Hash::make('Vendor@1234'),
                    'phone'   => '+977-9841000001',
                    'address' => 'Thamel, Kathmandu 44600',
                    'role'    => 'vendor',
                    'lat'     => 27.7152,
                    'lng'     => 85.3123,
                    'email_verified_at' => now(),
                ],
                'vendor' => [
                    'business_name'       => 'Ram\'s Spotless Cleaning',
                    'description'         => 'Professional residential and commercial cleaning services in Kathmandu.',
                    'rating'              => 4.80,
                    'service_area_radius' => 30,
                    'service_radius_km'   => 30,
                    'is_verified'         => true,
                    'is_featured'         => true,
                    'subscription_plan'   => 'pro',
                    'website'             => null,
                    'instagram'           => 'ramscleaning',
                ],
                'category_id' => 0,
                'services' => [
                    ['name' => 'House Deep Clean', 'description' => 'Full deep clean of all rooms, kitchen and bathrooms.', 'pricing_type' => 'fixed', 'price' => 2500.00, 'tags' => ['cleaning','deep clean','house']],
                    ['name' => 'Office Cleaning',  'description' => 'Weekly office cleaning service.', 'pricing_type' => 'hourly', 'price' => 800.00, 'tags' => ['cleaning','office','commercial']],
                ],
            ],
            [
                'user' => [
                    'name'    => 'Sita Plumbing Pro',
                    'email'   => 'maria@vendor.com',
                    'password'=> Hash::make('Vendor@1234'),
                    'phone'   => '+977-9841000002',
                    'address' => 'Lalitpur, Kathmandu 44700',
                    'role'    => 'vendor',
                    'lat'     => 27.6833,
                    'lng'     => 85.3167,
                    'email_verified_at' => now(),
                ],
                'vendor' => [
                    'business_name'       => 'Sita\'s Plumbing Services',
                    'description'         => 'Licensed plumber with 15 years experience. Available 24/7 in Kathmandu Valley.',
                    'rating'              => 4.95,
                    'service_area_radius' => 40,
                    'service_radius_km'   => 40,
                    'is_verified'         => true,
                    'is_featured'         => false,
                    'subscription_plan'   => 'basic',
                    'website'             => null,
                    'instagram'           => 'sitaplumbing',
                ],
                'category_id' => 1,
                'services' => [
                    ['name' => 'Tap Replacement',   'description' => 'Replace leaking or faulty taps.', 'pricing_type' => 'fixed', 'price' => 1500.00, 'tags' => ['plumbing','tap','repair']],
                    ['name' => 'Blocked Drain',     'description' => 'Clear blocked drains fast.', 'pricing_type' => 'fixed', 'price' => 2000.00, 'tags' => ['plumbing','drain','emergency']],
                    ['name' => 'Hot Water System',  'description' => 'Install or repair hot water systems.', 'pricing_type' => 'quote', 'price' => null, 'tags' => ['plumbing','hot water','installation']],
                ],
            ],
            [
                'user' => [
                    'name'    => 'Bikash Electrician',
                    'email'   => 'sam@vendor.com',
                    'password'=> Hash::make('Vendor@1234'),
                    'phone'   => '+977-9841000003',
                    'address' => 'Baneshwor, Kathmandu 44600',
                    'role'    => 'vendor',
                    'lat'     => 27.6912,
                    'lng'     => 85.3492,
                    'email_verified_at' => now(),
                ],
                'vendor' => [
                    'business_name'       => 'Bikash Electrical Solutions',
                    'description'         => 'Fully licensed electrician for residential and commercial work in Kathmandu.',
                    'rating'              => 4.70,
                    'service_area_radius' => 25,
                    'service_radius_km'   => 25,
                    'is_verified'         => true,
                    'is_featured'         => true,
                    'subscription_plan'   => 'pro',
                    'website'             => null,
                    'instagram'           => 'bikashelectrical',
                ],
                'category_id' => 2,
                'services' => [
                    ['name' => 'Power Point Install', 'description' => 'Install new power points anywhere in your home.', 'pricing_type' => 'fixed', 'price' => 3000.00, 'tags' => ['electrical','power point','install']],
                    ['name' => 'Lighting Setup',      'description' => 'Install ceiling lights, downlights, and smart lighting.', 'pricing_type' => 'hourly', 'price' => 1200.00, 'tags' => ['electrical','lighting','smart home']],
                ],
            ],
            [
                'user' => [
                    'name'    => 'Maya Garden Care',
                    'email'   => 'lisa@vendor.com',
                    'password'=> Hash::make('Vendor@1234'),
                    'phone'   => '+977-9841000004',
                    'address' => 'Bhaktapur, Kathmandu 44800',
                    'role'    => 'vendor',
                    'lat'     => 27.6710,
                    'lng'     => 85.4298,
                    'email_verified_at' => now(),
                ],
                'vendor' => [
                    'business_name'       => 'Maya\'s Garden Care',
                    'description'         => 'Expert gardening and lawn care services in Kathmandu Valley.',
                    'rating'              => 4.60,
                    'service_area_radius' => 20,
                    'service_radius_km'   => 20,
                    'is_verified'         => true,
                    'is_featured'         => false,
                    'subscription_plan'   => 'basic',
                    'website'             => null,
                    'instagram'           => 'mayagardencare',
                ],
                'category_id' => 3,
                'services' => [
                    ['name' => 'Lawn Mowing',     'description' => 'Regular lawn mowing and edging.', 'pricing_type' => 'fixed', 'price' => 1000.00, 'tags' => ['gardening','lawn','mowing']],
                    ['name' => 'Garden Cleanup',  'description' => 'Full garden cleanup including weeding and pruning.', 'pricing_type' => 'hourly', 'price' => 700.00, 'tags' => ['gardening','cleanup','pruning']],
                ],
            ],
        ];

        $vendorUsers   = [];
        $vendorModels  = [];
        $serviceModels = [];

        foreach ($vendorData as $idx => $vd) {
            $user   = User::create($vd['user']);
            $vendor = Vendor::create(array_merge(['user_id' => $user->id], $vd['vendor']));

            // default availability Mon–Fri
            for ($day = 1; $day <= 5; $day++) {
                VendorAvailability::create([
                    'vendor_id'     => $vendor->id,
                    'day_of_week'   => $day,
                    'is_available'  => true,
                    'start_time'    => '08:00',
                    'end_time'      => '17:00',
                ]);
            }

            foreach ($vd['services'] as $svc) {
                $service = Service::create([
                    'vendor_id'   => $vendor->id,
                    'category_id' => $catModels[$vd['category_id']]->id,
                    'name'        => $svc['name'],
                    'description' => $svc['description'],
                    'pricing_type'=> $svc['pricing_type'],
                    'price'       => $svc['price'],
                    'tags'        => $svc['tags'],
                    'is_active'   => true,
                    'radius'      => $vd['vendor']['service_area_radius'],
                ]);
                $serviceModels[] = $service;
            }

            $vendorUsers[]  = $user;
            $vendorModels[] = $vendor;
        }

        // ── 4. CUSTOMER USERS ────────────────────────────────────────
        $customers = [
            [
                'name'    => 'Alice Customer',
                'email'   => 'alice@customer.com',
                'password'=> Hash::make('Customer@1234'),
                'phone'   => '+977-9801000001',
                'address' => 'Lazimpat, Kathmandu 44600',
                'role'    => 'customer',
                'lat'     => 27.7200,
                'lng'     => 85.3190,
                'email_verified_at' => now(),
            ],
            [
                'name'    => 'Bob Customer',
                'email'   => 'bob@customer.com',
                'password'=> Hash::make('Customer@1234'),
                'phone'   => '+977-9801000002',
                'address' => 'Jawalakhel, Lalitpur 44700',
                'role'    => 'customer',
                'lat'     => 27.6710,
                'lng'     => 85.3100,
                'email_verified_at' => now(),
            ],
            [
                'name'    => 'Carol Customer',
                'email'   => 'carol@customer.com',
                'password'=> Hash::make('Customer@1234'),
                'phone'   => '+977-9801000003',
                'address' => 'Suryabinayak, Bhaktapur 44800',
                'role'    => 'customer',
                'lat'     => 27.6690,
                'lng'     => 85.4100,
                'email_verified_at' => now(),
            ],
        ];

        $customerModels = [];
        foreach ($customers as $c) {
            $customerModels[] = User::create($c);
        }

        // ── 5. BOOKINGS ──────────────────────────────────────────────
        $bookingStatuses = ['completed', 'completed', 'accepted', 'pending', 'cancelled'];
        $bookings = [];
        foreach ($serviceModels as $i => $svc) {
            $customer = $customerModels[$i % count($customerModels)];
            $vendor   = $vendorModels[$i % count($vendorModels)];
            $status   = $bookingStatuses[$i % count($bookingStatuses)];
            $booking  = Booking::create([
                'customer_id'    => $customer->id,
                'vendor_id'      => $vendor->id,
                'service_id'     => $svc->id,
                'booking_type'   => 'instant',
                'status'         => $status,
                'price'          => $svc->price ?? 100.00,
                'scheduled_time' => now()->subDays(rand(1, 30))->addHours(rand(9, 17)),
                'lat'            => $customer->lat,
                'lng'            => $customer->lng,
            ]);
            $bookings[] = ['booking' => $booking, 'customer' => $customer, 'vendor' => $vendor, 'status' => $status];
        }

        // ── 6. REVIEWS (only for completed bookings) ─────────────────
        $reviewTexts = [
            'Absolutely fantastic service! Very professional and thorough.',
            'Great work, arrived on time and did an excellent job.',
            'Very happy with the results. Will definitely use again.',
            'Professional service at a fair price. Highly recommended.',
            'Exceeded my expectations. Clean, fast, and reliable.',
        ];
        foreach ($bookings as $i => $b) {
            if ($b['status'] === 'completed') {
                Review::create([
                    'booking_id'  => $b['booking']->id,
                    'customer_id' => $b['customer']->id,
                    'vendor_id'   => $b['vendor']->id,
                    'rating'      => rand(4, 5),
                    'comment'     => $reviewTexts[$i % count($reviewTexts)],
                ]);
            }
        }

        // ── 7. MESSAGES ──────────────────────────────────────────────
        foreach (array_slice($bookings, 0, 3) as $b) {
            Message::create([
                'booking_id'  => $b['booking']->id,
                'sender_id'   => $b['customer']->id,
                'receiver_id' => $b['vendor']->id,
                'message'     => 'Hi, I would like to confirm my booking for tomorrow.',
                'is_read'     => true,
            ]);
            Message::create([
                'booking_id'  => $b['booking']->id,
                'sender_id'   => $b['vendor']->id,
                'receiver_id' => $b['customer']->id,
                'message'     => 'Hello! Confirmed. See you then. Please have the area ready.',
                'is_read'     => false,
            ]);
        }

        // ── 8. APP SETTINGS ──────────────────────────────────────────
        $settings = [
            ['key' => 'site_name',       'value' => 'ToleMate'],
            ['key' => 'site_tagline',    'value' => 'Your Local Service Marketplace'],
            ['key' => 'contact_email',   'value' => 'support@tolemate.com'],
            ['key' => 'currency',        'value' => 'AUD'],
            ['key' => 'currency_symbol', 'value' => '$'],
        ];
        foreach ($settings as $s) {
            Setting::updateOrCreate(['key' => $s['key']], ['value' => $s['value']]);
        }
    }
}

