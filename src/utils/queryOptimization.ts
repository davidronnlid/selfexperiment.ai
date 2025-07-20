import { supabase } from "./supaBase";

// Cache configuration
const CACHE_CONFIG = {
  DEFAULT_TTL: 5 * 60 * 1000, // 5 minutes
  USER_DATA_TTL: 10 * 60 * 1000, // 10 minutes
  STATIC_DATA_TTL: 30 * 60 * 1000, // 30 minutes
  MAX_CACHE_SIZE: 100,
};

// In-memory cache with TTL
class MemoryCache {
  private cache = new Map<string, { data: unknown; expires: number }>();
  private timers = new Map<string, NodeJS.Timeout>();

  set(key: string, data: unknown, ttl: number = CACHE_CONFIG.DEFAULT_TTL) {
    // Clear existing timer if unknown
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
    }

    // Set cache entry
    const expires = Date.now() + ttl;
    this.cache.set(key, { data, expires });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);
    this.timers.set(key, timer);

    // Cleanup if cache is too large
    if (this.cache.size > CACHE_CONFIG.MAX_CACHE_SIZE) {
      this.cleanup();
    }
  }

  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expires) {
      this.delete(key);
      return null;
    }

    return entry.data;
  }

  delete(key: string) {
    this.cache.delete(key);
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key)!);
      this.timers.delete(key);
    }
  }

  clear() {
    this.cache.clear();
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  private cleanup() {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expires) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.delete(key));
  }
}

// Global cache instance
const queryCache = new MemoryCache();

// Query optimization utilities
export const QueryOptimizer = {
  /**
   * Cached query executor
   */
  async cachedQuery<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl: number = CACHE_CONFIG.DEFAULT_TTL
  ): Promise<T> {
    // Check cache first
    const cached = queryCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Execute query
    const result = await queryFn();
    
    // Cache result
    queryCache.set(cacheKey, result, ttl);
    
    return result;
  },

  /**
   * Batch multiple queries into a single request
   */
  async batchQueries<T>(queries: Array<() => Promise<T>>): Promise<T[]> {
    return Promise.all(queries.map(query => query()));
  },

  /**
   * Get user variables with caching
   */
  async getUserVariables(userId: string): Promise<unknown[]> {
    const cacheKey = `user_variables_${userId}`;
    
    return this.cachedQuery(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("user_variable_preferences")
          .select("id, user_id, variable_id, is_shared, created_at, updated_at")
          .eq("user_id", userId);

        if (error) {
          console.error("Error fetching user variables:", error);
          return [];
        }

        return data || [];
      },
      CACHE_CONFIG.USER_DATA_TTL
    );
  },

  /**
   * Get user logs with optimized pagination
   */
  async getUserLogs(
    userId: string, 
    limit: number = 20, 
    offset: number = 0,
    variableId?: string
  ): Promise<unknown[]> {
    const cacheKey = `user_logs_${userId}_${limit}_${offset}_${variableId || 'all'}`;
    
    return this.cachedQuery(
      cacheKey,
      async () => {
        let query = supabase
          .from("variable_logs")
          .select("*")
          .eq("user_id", userId)
          .order("logged_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (variableId) {
          query = query.eq("variable_id", variableId);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      },
      CACHE_CONFIG.USER_DATA_TTL
    );
  },



  /**
   * Get user routines with caching
   */
  async getUserRoutines(userId: string): Promise<unknown[]> {
    const cacheKey = `user_routines_${userId}`;
    
    return this.cachedQuery(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("daily_routines")
          .select("*")
          .eq("user_id", userId)
          .eq("is_active", true);
        
        if (error) throw error;
        return data || [];
      },
      CACHE_CONFIG.USER_DATA_TTL
    );
  },

  /**
   * Get variable sharing settings
   */
  async getVariableSharingSettings(userId: string): Promise<unknown[]> {
    const cacheKey = `sharing_settings_${userId}`;
    
    return this.cachedQuery(
      cacheKey,
      async () => {
        const { data, error } = await supabase
          .from("user_variable_preferences")
          .select("*")
          .eq("user_id", userId);
        
        if (error) throw error;
        return data || [];
      },
      CACHE_CONFIG.USER_DATA_TTL
    );
  },

  /**
   * Invalidate cache for a specific key or pattern
   */
  invalidateCache(keyOrPattern: string) {
    if (keyOrPattern.includes('*')) {
      // Pattern matching - clear all keys that match
      const pattern = keyOrPattern.replace('*', '');
      const keysToDelete: string[] = [];
      
      for (const key of (queryCache as unknown).cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => queryCache.delete(key));
    } else {
      // Exact key match
      queryCache.delete(keyOrPattern);
    }
  },

  /**
   * Clear all cache
   */
  clearAllCache() {
    queryCache.clear();
  },

  /**
   * Preload data for faster page loads
   */
  async preloadUserData(userId: string) {
    // Preload essential data in the background
    const preloadPromises = [
      this.getUserVariables(userId),
      this.getUserLogs(userId, 10),
      this.getUserRoutines(userId),
    ];

    // Don't await - let them load in background
    Promise.all(preloadPromises).catch(console.error);
  },
};

// Cache invalidation helpers
export const CacheInvalidation = {
  /**
   * Invalidate user-specific cache when data changes
   */
  onUserDataChange(userId: string) {
    QueryOptimizer.invalidateCache(`user_*_${userId}`);
  },

  /**
   * Invalidate variable cache when variables change
   */
  onVariableChange(userId: string) {
    QueryOptimizer.invalidateCache(`user_variables_${userId}`);
  },

  /**
   * Invalidate logs cache when logs change
   */
  onLogChange(userId: string) {
    QueryOptimizer.invalidateCache(`user_logs_${userId}_*`);
  },
};

// Performance monitoring
export const PerformanceMonitor = {
  /**
   * Measure query execution time
   */
  async measureQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await queryFn();
      const duration = performance.now() - start;
      
      if (duration > 1000) { // Log slow queries
        console.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`Query failed: ${queryName} failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  },

  /**
   * Log cache hit ratio
   */
  logCacheStats() {
    const stats = {
      cacheSize: (queryCache as unknown).cache.size,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Cache Stats:', stats);
  },
};

export default QueryOptimizer; 