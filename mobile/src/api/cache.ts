import AsyncStorage from '@react-native-async-storage/async-storage';

const NS = 'tlcache.v1';

interface Entry {
  t: number;
  ttl: number;
  v: string;
}

export async function cacheGet(key: string): Promise<unknown | null> {
  try {
    const raw = await AsyncStorage.getItem(`${NS}:${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as Entry;
    if (Date.now() - entry.t > entry.ttl) {
      AsyncStorage.removeItem(`${NS}:${key}`).catch(() => {});
      return null;
    }
    return JSON.parse(entry.v);
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${NS}:${key}`,
      JSON.stringify({ t: Date.now(), ttl, v: JSON.stringify(value) }),
    );
  } catch {
    // cache is best-effort; never block the request
  }
}