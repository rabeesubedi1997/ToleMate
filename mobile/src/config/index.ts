/**
 * Centralized API configuration.
 *
 * The app talks to the same Laravel backend as the web frontend:
 *   - Dev (emulator): 10.0.2.2 = host machine's localhost from the Android emulator
 *   - Prod: the public domain (same domain as the website, single origin)
 */
export const API_URL = __DEV__
  ? 'http://10.0.2.2:8001/api'
  : 'https://tolemate.kitetool.com/api';

export const SSE_URL = `${API_URL}/events`;

export function assetUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
