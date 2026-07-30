<?php

namespace App\Http\Controllers;

use App\Models\PageSeo;
use App\Models\Service;
use App\Models\Category;
use App\Models\Vendor;
use Illuminate\Http\Request;

class PrerenderController extends Controller
{
    protected $crawlerPattern = '/bot|crawl|slurp|spider|mediapartners|googlebot|bingbot|yandex|baidu|duckduckbot|facebookexternalhit|twitterbot|whatsapp|slack|discord|telegram|skype|linkedin|pinterest|ahrefs|semrush|sitebulb|mj12bot|dotbot/i';

    protected $siteName = 'ToleMate';
    protected $siteUrl = '';

    public function __construct()
    {
        $this->siteUrl = url('/');
    }

    public function handle(Request $request, $path = '')
    {
        $path = '/' . ltrim((string) $path, '/');
        $isCrawler = preg_match($this->crawlerPattern, $request->header('User-Agent', ''));

        $indexPath = base_path('../frontend/build/index.html');
        if (!$indexPath || !file_exists($indexPath)) {
            $indexPath = realpath(__DIR__ . '/../../../frontend/build/index.html');
        }
        if (!$indexPath || !file_exists($indexPath)) {
            return response('Frontend not built. Run: cd frontend && npm run build', 503);
        }

        $html = file_get_contents($indexPath);

        if ($isCrawler) {
            $seo = $this->resolveSeo($path);
            if ($seo) {
                $html = $this->injectMeta($html, $seo);
            }
        }

        return response($html)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    protected function resolveSeo(string $path): ?array
    {
        if (preg_match('#^/services/(\d+)(?:/.+)?$#', $path, $m)) {
            return $this->serviceSeo((int) $m[1]);
        }
        if (preg_match('#^/categories/(\d+)$#', $path, $m)) {
            return $this->categorySeo((int) $m[1]);
        }
        if (preg_match('#^/vendors/(\d+)$#', $path, $m)) {
            return $this->vendorSeo((int) $m[1]);
        }

        return $this->staticPageSeo($path);
    }

    protected function serviceSeo(int $id): ?array
    {
        $service = Service::with(['vendor', 'category'])->where('is_active', true)->find($id);
        if (!$service) return null;

        $name = e($service->name);
        $vendorName = e($service->vendor?->business_name ?? 'Professional');
        $catName = e($service->category?->name ?? 'Service');
        $desc = e(substr($service->description ?? 'Book this service on ToleMate', 0, 160));
        $price = $service->price ? 'Rs. ' . number_format($service->price) : 'Free quote';
        $image = $service->images?->first()?->image_path
            ? url('/storage/' . ltrim($service->images->first()->image_path, '/'))
            : '';

        return [
            'title'       => "$name – $vendorName | ToleMate",
            'description' => $desc,
            'keywords'    => "$name, $catName, $vendorName, ToleMate",
            'og_title'    => $name,
            'og_desc'     => $desc,
            'og_image'    => $image,
            'og_url'      => $this->siteUrl . '/services/' . $id,
            'no_index'    => false,
            'json_ld'     => [
                '@context' => 'https://schema.org',
                '@type' => 'Product',
                'name' => $service->name,
                'description' => $service->description,
                'offers' => [
                    '@type' => 'Offer',
                    'price' => $service->price ?? 0,
                    'priceCurrency' => 'NPR',
                ],
                'provider' => [
                    '@type' => 'LocalBusiness',
                    'name' => $service->vendor?->business_name ?? $vendorName,
                ],
            ],
        ];
    }

    protected function categorySeo(int $id): ?array
    {
        $cat = Category::find($id);
        if (!$cat) return null;

        $name = e($cat->name);
        return [
            'title'       => "$name Services - ToleMate",
            'description' => "Browse $name services near you. Find trusted $name professionals on ToleMate.",
            'keywords'    => "$name, $name services, ToleMate",
            'og_title'    => "$name Services | ToleMate",
            'og_desc'     => "Find trusted $name service providers near you.",
            'og_image'    => '',
            'og_url'      => $this->siteUrl . '/categories/' . $id,
            'no_index'    => false,
            'json_ld'     => null,
        ];
    }

    protected function vendorSeo(int $id): ?array
    {
        $vendor = Vendor::with('user')->find($id);
        if (!$vendor) return null;

        $name = e($vendor->business_name ?? 'Professional');
        $desc = e(substr($vendor->description ?? 'Service provider on ToleMate', 0, 160));
        $rating = $vendor->rating ? number_format((float) $vendor->rating, 1) : null;

        return [
            'title'       => "$name - ToleMate",
            'description' => $desc,
            'keywords'    => "$name, service provider, ToleMate",
            'og_title'    => $name,
            'og_desc'     => $desc,
            'og_image'    => $vendor->avatar ? url('/storage/' . ltrim($vendor->avatar, '/')) : '',
            'og_url'      => $this->siteUrl . '/vendors/' . $id,
            'no_index'    => false,
            'json_ld'     => [
                '@context' => 'https://schema.org',
                '@type' => 'LocalBusiness',
                'name' => $vendor->business_name ?? $name,
                'description' => $vendor->description ?? '',
                'telephone' => $vendor->user?->phone ?? '',
                'aggregateRating' => $rating ? [
                    '@type' => 'AggregateRating',
                    'ratingValue' => $rating,
                    'bestRating' => 5,
                ] : null,
            ],
        ];
    }

    protected function staticPageSeo(string $path): ?array
    {
        $dbSeo = PageSeo::where('page', $path)->first();
        if ($dbSeo) {
            return [
                'title'       => e($dbSeo->title),
                'description' => e($dbSeo->description ?? ''),
                'keywords'    => e($dbSeo->keywords ?? ''),
                'og_title'    => e($dbSeo->title),
                'og_desc'     => e($dbSeo->description ?? ''),
                'og_image'    => $dbSeo->og_image ?? '',
                'og_url'      => $this->siteUrl . $path,
                'no_index'    => (bool) $dbSeo->no_index,
                'json_ld'     => null,
            ];
        }

        if ($path === '/' || $path === '') {
            return [
                'title'       => 'ToleMate - Find Trusted Local Service Providers in Nepal',
                'description' => 'ToleMate connects you with verified local professionals for home repairs, plumbing, electrical work, cleaning, and more.',
                'keywords'    => 'tolemate, local services, home repair, Nepal',
                'og_title'    => 'ToleMate - Local Service Marketplace',
                'og_desc'     => 'Find trusted local service providers near you.',
                'og_image'    => '',
                'og_url'      => $this->siteUrl,
                'no_index'    => false,
                'json_ld'     => [
                    '@context' => 'https://schema.org',
                    '@type' => 'Organization',
                    'name' => 'ToleMate',
                    'url' => $this->siteUrl,
                    'description' => 'Local service marketplace connecting customers with verified professionals in Nepal.',
                ],
            ];
        }

        return null;
    }

    protected function injectMeta(string $html, array $seo): string
    {
        $title = $seo['title'] ?? $this->siteName;
        $description = $seo['description'] ?? '';
        $keywords = $seo['keywords'] ?? '';
        $ogTitle = $seo['og_title'] ?? $title;
        $ogDesc = $seo['og_desc'] ?? $description;
        $ogImage = $seo['og_image'] ?? '';
        $ogUrl = $seo['og_url'] ?? $this->siteUrl;
        $noIndex = $seo['no_index'] ?? false;
        $jsonLd = $seo['json_ld'] ?? null;

        $inject = '<title>' . e($title) . '</title>' . "\n";
        $inject .= '    <meta name="description" content="' . e($description) . '" />' . "\n";
        if ($keywords) {
            $inject .= '    <meta name="keywords" content="' . e($keywords) . '" />' . "\n";
        }
        $inject .= '    <meta property="og:title" content="' . e($ogTitle) . '" />' . "\n";
        $inject .= '    <meta property="og:description" content="' . e($ogDesc) . '" />' . "\n";
        $inject .= '    <meta property="og:url" content="' . e($ogUrl) . '" />' . "\n";
        $inject .= '    <meta property="og:type" content="website" />' . "\n";
        $inject .= '    <meta property="og:site_name" content="' . e($this->siteName) . '" />' . "\n";
        if ($ogImage) {
            $inject .= '    <meta property="og:image" content="' . e($ogImage) . '" />' . "\n";
            $inject .= '    <meta name="twitter:image" content="' . e($ogImage) . '" />' . "\n";
        }
        $inject .= '    <meta name="twitter:card" content="summary_large_image" />' . "\n";
        $inject .= '    <meta name="twitter:title" content="' . e($ogTitle) . '" />' . "\n";
        $inject .= '    <meta name="twitter:description" content="' . e($ogDesc) . '" />' . "\n";
        $inject .= '    <link rel="canonical" href="' . e($ogUrl) . '" />' . "\n";
        if ($noIndex) {
            $inject .= '    <meta name="robots" content="noindex, nofollow" />' . "\n";
        }
        if ($jsonLd) {
            $inject .= '    <script type="application/ld+json">' . json_encode($jsonLd, JSON_UNESCAPED_SLASHES) . '</script>' . "\n";
        }

        $html = str_replace('<title>ToleMate</title>', trim($inject), $html);
        $html = preg_replace('/<meta name="description" content="[^"]*"\s*\/?>/i', '', $html, 1);

        return $html;
    }
}
