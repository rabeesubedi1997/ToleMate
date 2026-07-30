<?php

use Illuminate\Support\Facades\Route;
use App\Models\Service;
use App\Models\Category;
use App\Models\Vendor;
use App\Http\Controllers\PrerenderController;

Route::get('/robots.txt', function () {
    $base = url('/');
    $disallowAdmin = 'Disallow: /admin';
    return response("User-agent: *\nAllow: /\n{$disallowAdmin}\nSitemap: {$base}/sitemap.xml\n")
        ->header('Content-Type', 'text/plain');
});

Route::get('/sitemap.xml', function () {
    $base = url('/');
    $services = Service::where('is_active', true)->select('id', 'name', 'updated_at')->get();
    $categories = Category::select('id', 'name', 'updated_at')->get();
    $vendors = Vendor::select('id', 'business_name', 'updated_at')->get();

    $xml = '<?xml version="1.0" encoding="UTF-8"?>';
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

    $pages = [
        ['loc' => $base, 'priority' => '1.0', 'changefreq' => 'weekly'],
        ['loc' => $base . '/services', 'priority' => '0.9', 'changefreq' => 'daily'],
        ['loc' => $base . '/login', 'priority' => '0.3', 'changefreq' => 'monthly'],
        ['loc' => $base . '/register', 'priority' => '0.5', 'changefreq' => 'monthly'],
    ];
    foreach ($pages as $p) {
        $xml .= '<url><loc>' . e($p['loc']) . '</loc><priority>' . $p['priority'] . '</priority><changefreq>' . $p['changefreq'] . '</changefreq></url>';
    }

    foreach ($categories as $cat) {
        $xml .= '<url><loc>' . e($base . '/categories/' . $cat->id) . '</loc><priority>0.8</priority><changefreq>weekly</changefreq><lastmod>' . $cat->updated_at->toW3cString() . '</lastmod></url>';
    }

    foreach ($services as $s) {
        $xml .= '<url><loc>' . e($base . '/services/' . $s->id) . '</loc><priority>0.7</priority><changefreq>weekly</changefreq><lastmod>' . $s->updated_at->toW3cString() . '</lastmod></url>';
    }

    foreach ($vendors as $v) {
        $xml .= '<url><loc>' . e($base . '/vendors/' . $v->id) . '</loc><priority>0.6</priority><changefreq>weekly</changefreq><lastmod>' . $v->updated_at->toW3cString() . '</lastmod></url>';
    }

    $xml .= '</urlset>';
    return response($xml)->header('Content-Type', 'application/xml');
});

Route::get('/{path?}', [PrerenderController::class, 'handle'])
    ->where('path', '.*')
    ->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class);
