<?php

require_once __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

// Step 1: Login as admin
$loginReq = Illuminate\Http\Request::create('/api/login', 'POST', [], [], [], [
    'HTTP_ACCEPT' => 'application/json',
    'CONTENT_TYPE' => 'application/json',
], json_encode(['email' => 'admin@tolemate.com', 'password' => 'password']));
$loginRes = $kernel->handle($loginReq);
$loginData = json_decode($loginRes->getContent(), true);
$token = $loginData['access_token'] ?? null;
echo "Login status: " . $loginRes->getStatusCode() . "\n";
echo "Role: " . ($loginData['user']['role'] ?? 'N/A') . "\n";

// Step 2: Try to create a booking as admin
$bookingReq = Illuminate\Http\Request::create('/api/bookings', 'POST', [], [], [], [
    'HTTP_ACCEPT'    => 'application/json',
    'CONTENT_TYPE'   => 'application/json',
    'HTTP_AUTHORIZATION' => "Bearer $token",
], json_encode([
    'service_id'   => 1,
    'booking_type' => 'instant',
    'message'      => 'Test booking from admin',
]));
$bookingRes = $kernel->handle($bookingReq);
echo "Booking status: " . $bookingRes->getStatusCode() . "\n";
echo "Booking response: " . $bookingRes->getContent() . "\n";
