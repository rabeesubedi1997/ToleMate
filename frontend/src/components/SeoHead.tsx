import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { API_BASE } from '../utils/config';

interface SeoHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  canonicalUrl?: string;
  noIndex?: boolean;
  jsonLd?: Record<string, any>;
  locale?: string;
  page?: string;
}

const SITE_NAME = 'ToleMate';
const DEFAULT_OG_IMAGE = 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&q=80';

const SeoHead: React.FC<SeoHeadProps> = ({
  title: propTitle,
  description: propDesc,
  keywords: propKeywords,
  ogTitle: propOgTitle,
  ogDescription: propOgDesc,
  ogImage: propOgImage,
  ogType = 'website',
  canonicalUrl,
  noIndex: propNoIndex,
  jsonLd,
  locale = 'en',
  page,
}) => {
  const [dbSeo, setDbSeo] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    if (!page) return;
    fetch(`${API_BASE}/api/page-seo/${encodeURIComponent(page)}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setDbSeo(d))
      .catch(() => {});
  }, [page]);

  const title = propTitle || dbSeo?.title || '';
  const description = propDesc || dbSeo?.description || '';
  const keywords = propKeywords || dbSeo?.keywords || '';
  const ogImage = propOgImage || dbSeo?.og_image || DEFAULT_OG_IMAGE;
  const noIndex = propNoIndex ?? dbSeo?.no_index ?? false;

  const fullTitle = title ? (title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`) : SITE_NAME;
  const url = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : '');
  const ogT = propOgTitle || title || SITE_NAME;
  const ogD = propOgDesc || description || '';

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url} />

      <meta property="og:title" content={ogT} />
      <meta property="og:description" content={ogD} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={locale} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={ogT} />
      <meta name="twitter:description" content={ogD} />
      <meta name="twitter:image" content={ogImage} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
};

export function organizationJsonLd(name?: string, logo?: string, url?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: name || SITE_NAME,
    url: url || (typeof window !== 'undefined' ? window.location.origin : ''),
    logo: logo || DEFAULT_OG_IMAGE,
    description: 'Local service marketplace connecting customers with verified professionals.',
    address: { '@type': 'PostalAddress', addressCountry: 'NP' },
  };
}

export function websiteJsonLd(name?: string, url?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: name || SITE_NAME,
    url: url || (typeof window !== 'undefined' ? window.location.origin : ''),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${url || (typeof window !== 'undefined' ? window.location.origin : '')}/services?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function localBusinessJsonLd(data: {
  name: string;
  description: string;
  image?: string;
  url?: string;
  telephone?: string;
  address?: string;
  rating?: number;
  priceRange?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: data.name,
    description: data.description,
    image: data.image || DEFAULT_OG_IMAGE,
    url: data.url || (typeof window !== 'undefined' ? window.location.href : ''),
    telephone: data.telephone,
    address: data.address ? { '@type': 'PostalAddress', streetAddress: data.address } : undefined,
    aggregateRating: data.rating ? {
      '@type': 'AggregateRating',
      ratingValue: data.rating,
      bestRating: 5,
      ratingCount: 1,
    } : undefined,
    priceRange: data.priceRange || '$$',
  };
}

export default SeoHead;
