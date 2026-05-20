import { API_BASE } from '../utils/config';
// Category-based placeholder images using high-quality Unsplash photos
const CATEGORY_IMAGES: Record<string, string> = {
  'Home Repair':          'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600&q=80',
  'Cleaning':             'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600&q=80',
  'Tech Support':         'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&q=80',
  'Health & Wellness':    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80',
  'Tutors':               'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=80',
  'Events':               'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=600&q=80',
  'Beauty':               'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80',
  'Fitness':              'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80',
  'Plumbing':             'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600&q=80',
  'Electrical':           'https://images.unsplash.com/photo-1621905251189-08b45249a300?w=600&q=80',
  'Automobile':           'https://images.unsplash.com/photo-1486754735734-325b5831c3ad?w=600&q=80',
  'Pet Care':             'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&q=80',
  'Professional Services':'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80',
  'Home Improvement':     'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80',
  'Painting':             'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=600&q=80',
  'CCTV & Security':      'https://images.unsplash.com/photo-1557597774-9d475d030a86?w=600&q=80',
  'AC Repair':            'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&q=80',
  'Pest Control':         'https://images.unsplash.com/photo-1595424651896-d57ab2e15a37?w=600&q=80',
  'Carpentry':            'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?w=600&q=80',
  'Gardening':            'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&q=80',
  'Laundry':              'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=600&q=80',
  'default':              'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=600&q=80',
};

const BASE_URL = API_BASE;

/**
 * Get the display image URL for a service.
 * Prefers the first uploaded service image, falls back to a category-specific placeholder.
 */
export function getServiceImage(service: {
  images?: { image_url?: string; image_path?: string }[];
  category?: { name?: string } | null;
}): string {
  if (service.images && service.images.length > 0) {
    const img = service.images[0];
    const path = img.image_url || img.image_path || '';
    if (path) {
      if (path.startsWith('http')) return path;
      return `${BASE_URL}${path}`;
    }
  }
  const categoryName = service.category?.name || 'default';
  return CATEGORY_IMAGES[categoryName] ?? CATEGORY_IMAGES['default'];
}
