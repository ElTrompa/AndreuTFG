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

class CacheService {
  /**
   * Get cached data if it exists and hasn't expired
   */
  async get<T>(key: string, ttlMs: number): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const age = Date.now() - entry.timestamp;

      if (age < ttlMs) {
        console.log(`[Cache] HIT: ${key} (age: ${(age / 1000).toFixed(1)}s)`);
        return entry.data;
      }

      console.log(`[Cache] EXPIRED: ${key} (age: ${(age / 1000).toFixed(1)}s)`);
      await AsyncStorage.removeItem(key);
      return null;
    } catch (error) {
      console.error(`[Cache] Error reading ${key}:`, error);
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
      await AsyncStorage.setItem(key, JSON.stringify(entry));
      console.log(`[Cache] SET: ${key}`);
    } catch (error) {
      console.error(`[Cache] Error writing ${key}:`, error);
    }
  }

  /**
   * Clear specific cache entry
   */
  async clear(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      console.log(`[Cache] CLEARED: ${key}`);
    } catch (error) {
      console.error(`[Cache] Error clearing ${key}:`, error);
    }
  }

  /**
   * Clear all cache entries matching a pattern
   */
  async clearPattern(pattern: string): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const toRemove = keys.filter(key => key.includes(pattern));
      await Promise.all(toRemove.map(key => AsyncStorage.removeItem(key)));
      console.log(`[Cache] CLEARED PATTERN: ${pattern} (${toRemove.length} entries)`);
    } catch (error) {
      console.error(`[Cache] Error clearing pattern ${pattern}:`, error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ total: number; byType: Record<string, number> }> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const stats: Record<string, number> = {};
      
      keys.forEach(key => {
        const type = key.split(':')[0];
        stats[type] = (stats[type] || 0) + 1;
      });

      return {
        total: keys.length,
        byType: stats,
      };
    } catch (error) {
      console.error('[Cache] Error getting stats:', error);
      return { total: 0, byType: {} };
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
