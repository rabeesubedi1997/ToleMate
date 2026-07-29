// Centralized API configuration
// Set REACT_APP_API_URL in .env.local to override
// Default is 8001 (Laragon Apache multi-worker) — required for SSE to work
export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8001';

// Fallback image for broken service images
export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&q=70';

// Build a full asset URL from a relative path (e.g. /storage/media/foo.jpg)
export function assetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}
