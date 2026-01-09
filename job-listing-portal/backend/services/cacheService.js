/**
 * Cache Service for Job Listings Performance Optimization
 * Implements in-memory caching for search results and frequently accessed data
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time to live for cache entries
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
    this.maxCacheSize = 1000; // Maximum number of cache entries
    
    // Clean up expired entries every minute
    setInterval(() => {
      this.cleanupExpired();
    }, 60 * 1000);
  }

  /**
   * Generate cache key from search criteria
   */
  generateSearchKey(criteria) {
    const normalized = {
      keywords: criteria.keywords || '',
      location: criteria.location || '',
      jobType: Array.isArray(criteria.jobType) ? criteria.jobType.sort().join(',') : criteria.jobType || '',
      experienceLevel: Array.isArray(criteria.experienceLevel) ? criteria.experienceLevel.sort().join(',') : criteria.experienceLevel || '',
      skills: Array.isArray(criteria.skills) ? criteria.skills.sort().join(',') : criteria.skills || '',
      salaryMin: criteria.salaryRange?.min || '',
      salaryMax: criteria.salaryRange?.max || '',
      page: criteria.page || 1,
      limit: criteria.limit || 20,
      sortBy: criteria.sortBy || 'relevance'
    };
    
    return `search:${JSON.stringify(normalized)}`;
  }

  /**
   * Set cache entry with TTL
   */
  set(key, value, ttl = this.defaultTTL) {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.delete(firstKey);
    }

    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttl);
    
    console.log(`Cache SET: ${key} (TTL: ${ttl}ms)`);
  }

  /**
   * Get cache entry if not expired
   */
  get(key) {
    const expiry = this.ttl.get(key);
    
    if (!expiry || Date.now() > expiry) {
      this.delete(key);
      return null;
    }

    const value = this.cache.get(key);
    console.log(`Cache HIT: ${key}`);
    return value;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
    console.log(`Cache DELETE: ${key}`);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.ttl.clear();
    console.log('Cache CLEARED');
  }

  /**
   * Clean up expired entries
   */
  cleanupExpired() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, expiry] of this.ttl.entries()) {
      if (now > expiry) {
        this.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cache cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      hitRate: this.hitCount / (this.hitCount + this.missCount) || 0,
      entries: Array.from(this.cache.keys())
    };
  }

  /**
   * Cache search results
   */
  cacheSearchResults(criteria, results) {
    const key = this.generateSearchKey(criteria);
    this.set(key, {
      results,
      timestamp: Date.now(),
      criteria
    }, 5 * 60 * 1000); // Cache search results for 5 minutes
  }

  /**
   * Get cached search results
   */
  getCachedSearchResults(criteria) {
    const key = this.generateSearchKey(criteria);
    const cached = this.get(key);
    
    if (cached) {
      return {
        ...cached.results,
        fromCache: true,
        cachedAt: cached.timestamp
      };
    }
    
    return null;
  }

  /**
   * Cache job details
   */
  cacheJobDetails(jobId, jobData) {
    const key = `job:${jobId}`;
    this.set(key, jobData, 10 * 60 * 1000); // Cache job details for 10 minutes
  }

  /**
   * Get cached job details
   */
  getCachedJobDetails(jobId) {
    const key = `job:${jobId}`;
    return this.get(key);
  }

  /**
   * Invalidate job-related cache entries
   */
  invalidateJobCache(jobId) {
    // Remove specific job cache
    this.delete(`job:${jobId}`);
    
    // Remove search caches (they might contain this job)
    const searchKeys = Array.from(this.cache.keys()).filter(key => key.startsWith('search:'));
    searchKeys.forEach(key => this.delete(key));
    
    console.log(`Invalidated cache for job ${jobId} and related searches`);
  }

  /**
   * Cache popular search terms
   */
  cachePopularTerms(terms) {
    this.set('popular-terms', terms, 30 * 60 * 1000); // Cache for 30 minutes
  }

  /**
   * Get cached popular terms
   */
  getCachedPopularTerms() {
    return this.get('popular-terms');
  }

  /**
   * Cache search suggestions
   */
  cacheSearchSuggestions(query, suggestions) {
    const key = `suggestions:${query.toLowerCase()}`;
    this.set(key, suggestions, 15 * 60 * 1000); // Cache for 15 minutes
  }

  /**
   * Get cached search suggestions
   */
  getCachedSearchSuggestions(query) {
    const key = `suggestions:${query.toLowerCase()}`;
    return this.get(key);
  }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;