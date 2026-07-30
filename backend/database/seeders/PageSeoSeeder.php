<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PageSeoSeeder extends Seeder
{
    public function run(): void
    {
        $entries = [
            [
                'page'        => '/',
                'title'       => 'ToleMate - Find Trusted Local Service Providers in Nepal',
                'description' => 'ToleMate connects you with verified local professionals for home repairs, plumbing, electrical work, cleaning, and more. Book trusted services near you in Nepal.',
                'keywords'    => 'tolemate, local services, home repair, plumbing, electrical, cleaning, Nepal, service marketplace',
                'og_image'    => '',
                'no_index'    => false,
            ],
            [
                'page'        => '/services',
                'title'       => 'Browse All Services - ToleMate',
                'description' => 'Find trusted local service providers for home repairs, professional consulting, and more. Browse by category, compare prices, and book instantly.',
                'keywords'    => 'local services, home repair, plumbing, electrical, cleaning, Nepal, service marketplace',
                'og_image'    => '',
                'no_index'    => false,
            ],
            [
                'page'        => '/marketplace',
                'title'       => 'Marketplace - ToleMate',
                'description' => 'Explore service requests posted by customers near you. Find new opportunities and grow your business with ToleMate.',
                'keywords'    => 'marketplace, service requests, local jobs, Nepal',
                'og_image'    => '',
                'no_index'    => false,
            ],
            [
                'page'        => '/about',
                'title'       => 'About Us - ToleMate',
                'description' => 'Learn about ToleMate — Nepal\'s trusted local service marketplace. Our mission is to connect customers with verified professionals.',
                'keywords'    => 'about tolemate, local service marketplace, Nepal',
                'og_image'    => '',
                'no_index'    => false,
            ],
            [
                'page'        => '/contact',
                'title'       => 'Contact Us - ToleMate',
                'description' => 'Get in touch with the ToleMate team. We\'re here to help with any questions or support you need.',
                'keywords'    => 'contact tolemate, customer support, Nepal',
                'og_image'    => '',
                'no_index'    => false,
            ],
            [
                'page'        => '/faq',
                'title'       => 'Frequently Asked Questions - ToleMate',
                'description' => 'Find answers to common questions about using ToleMate — how to book services, pricing, payments, and more.',
                'keywords'    => 'FAQ, help, how to book, ToleMate guide',
                'og_image'    => '',
                'no_index'    => false,
            ],
            [
                'page'        => '/blog',
                'title'       => 'Blog - ToleMate',
                'description' => 'Read the latest articles and tips from ToleMate about home improvement, service tips, and finding the right professional.',
                'keywords'    => 'blog, home improvement, service tips, Nepal',
                'og_image'    => '',
                'no_index'    => false,
            ],
            [
                'page'        => '/login',
                'title'       => 'Sign In - ToleMate',
                'description' => 'Sign in to your ToleMate account to manage bookings, messages, and preferences.',
                'keywords'    => '',
                'og_image'    => '',
                'no_index'    => true,
            ],
            [
                'page'        => '/register',
                'title'       => 'Create an Account - ToleMate',
                'description' => 'Join ToleMate as a customer or service provider. Sign up free and start booking or offering services today.',
                'keywords'    => 'sign up, register, create account, ToleMate',
                'og_image'    => '',
                'no_index'    => true,
            ],
        ];

        foreach ($entries as $entry) {
            DB::table('page_seo')->updateOrInsert(
                ['page' => $entry['page']],
                $entry
            );
        }
    }
}
