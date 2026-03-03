import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_TTL = {
  ACTIVITIES: 24 * 60 * 60 * 1000, // 24 hours
  ACHIEVEMENTS: 24 * 60 * 60 * 1000, // 24 hours
  ATHLETE: 12 * 60 * 60 * 1000, // 12 hours
  SEGMENTS: 7 * 24 * 60 * 60 * 1000, // 7 days
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory cache as fallback
const memoryCache = new Map<string, CacheEntry<any>>();
let asyncStorageAvailable = true;

class CacheService {
  /**
   * Get cached data if it exists and hasn't expired
   */
  async get<T>(key: string, ttlMs: number): Promise<T | null> {
    try {
      // Try memory cache first
      const memoryCached = memoryCache.get(key);
      if (memoryCached) {
        const age = Date.now() - memoryCached.timestamp;
        if (age < ttlMs) {
          console.log(`[Cache] MEM HIT: ${key}`);
          return memoryCached.data;
        }
        memoryCache.delete(key);
      }

      // Try AsyncStorage if available
      if (!asyncStorageAvailable) return null;

      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const age = Date.now() - entry.timestamp;

      if (age < ttlMs) {
        console.log(`[Cache] HIT: ${key}`);
        return entry.data;
      }

      await AsyncStorage.removeItem(key);
      return null;
    } catch (error) {
      console.log(`[Cache] Error reading ${key}, using memory only:`, (error as any)?.message);
      asyncStorageAvailable = false;
      return null;
    }
  }

  /**
   * Set cache data
   */
  async set<T>(key: string, data: T): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
      };

      // Always save to memory
      memoryCache.set(key, entry);

      // Try AsyncStorage if available
      if (!asyncStorageAvailable) return;

      await AsyncStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.log(`[Cache] Error writing ${key}:`, (error as any)?.message);
      asyncStorageAvailable = false;
    }
  }

  /**
   * Clear specific cache entry
   */
  async remove(key: string): Promise<void> {
    memoryCache.delete(key);
    if (asyncStorageAvailable) {
      try {
        await AsyncStorage.removeItem(key);
      } catch (error) {
        asyncStorageAvailable = false;
      }
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    memoryCache.clear();
    if (asyncStorageAvailable) {
      try {
        await AsyncStorage.clear();
      } catch (error) {
        asyncStorageAvailable = false;
      }
    }
  }
}

export const cacheService = new CacheService();
export const CACHE_KEYS = {
  ACTIVITIES: (athleteId: string | number) => `activities:${athleteId}`,
  ACTIVITIES_DETAIL: (activityId: string | number) => `activity:${activityId}`,
  ACHIEVEMENTS: (athleteId: string | number) => `achievements:${athleteId}`,
  ATHLETE: (athleteId: string | number) => `athlete:${athleteId}`,
  SEGMENTS: (activityId: string | number) => `segments:${activityId}`,
  HRV: (athleteId: string | number) => `hrv:${athleteId}`,
  PMC: (athleteId: string | number) => `pmc:${athleteId}`,
};
export { CACHE_TTL };
