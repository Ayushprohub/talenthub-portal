/**
 * Performance Monitoring Middleware
 * Tracks response times and identifies slow queries
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: new Map(),
      slowQueries: [],
      averageResponseTimes: new Map()
    };
    this.slowQueryThreshold = 1000; // 1 second
    this.maxSlowQueries = 100; // Keep last 100 slow queries
  }

  /**
   * Middleware to track request performance
   */
  trackRequest() {
    return (req, res, next) => {
      const startTime = Date.now();
      const originalSend = res.send;

      // Override res.send to capture response time
      res.send = function(data) {
        const responseTime = Date.now() - startTime;
        
        // Track metrics
        performanceMonitor.recordMetrics(req, res, responseTime);
        
        // Log slow requests
        if (responseTime > performanceMonitor.slowQueryThreshold) {
          performanceMonitor.logSlowQuery(req, responseTime);
        }

        // Call original send
        originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * Record performance metrics
   */
  recordMetrics(req, res, responseTime) {
    const route = `${req.method} ${req.route?.path || req.path}`;
    
    // Update request count and average response time
    if (!this.metrics.requests.has(route)) {
      this.metrics.requests.set(route, { count: 0, totalTime: 0 });
    }

    const routeMetrics = this.metrics.requests.get(route);
    routeMetrics.count++;
    routeMetrics.totalTime += responseTime;

    // Calculate and store average response time
    const averageTime = routeMetrics.totalTime / routeMetrics.count;
    this.metrics.averageResponseTimes.set(route, averageTime);

    // Log performance info in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`${route} - ${responseTime}ms (avg: ${averageTime.toFixed(1)}ms)`);
    }
  }

  /**
   * Log slow queries for analysis
   */
  logSlowQuery(req, responseTime) {
    const slowQuery = {
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      query: req.query,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    };

    this.metrics.slowQueries.push(slowQuery);

    // Keep only the last N slow queries
    if (this.metrics.slowQueries.length > this.maxSlowQueries) {
      this.metrics.slowQueries.shift();
    }

    console.warn(`SLOW QUERY: ${req.method} ${req.path} - ${responseTime}ms`);
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const stats = {
      totalRequests: 0,
      averageResponseTime: 0,
      slowQueries: this.metrics.slowQueries.length,
      routes: []
    };

    let totalTime = 0;
    
    for (const [route, metrics] of this.metrics.requests.entries()) {
      stats.totalRequests += metrics.count;
      totalTime += metrics.totalTime;
      
      stats.routes.push({
        route,
        requests: metrics.count,
        averageResponseTime: (metrics.totalTime / metrics.count).toFixed(1),
        totalTime: metrics.totalTime
      });
    }

    stats.averageResponseTime = stats.totalRequests > 0 
      ? (totalTime / stats.totalRequests).toFixed(1) 
      : 0;

    // Sort routes by average response time (slowest first)
    stats.routes.sort((a, b) => parseFloat(b.averageResponseTime) - parseFloat(a.averageResponseTime));

    return stats;
  }

  /**
   * Get slow queries
   */
  getSlowQueries(limit = 20) {
    return this.metrics.slowQueries
      .slice(-limit)
      .sort((a, b) => b.responseTime - a.responseTime);
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics.requests.clear();
    this.metrics.slowQueries = [];
    this.metrics.averageResponseTimes.clear();
  }

  /**
   * Get route-specific metrics
   */
  getRouteMetrics(route) {
    const metrics = this.metrics.requests.get(route);
    if (!metrics) {
      return null;
    }

    return {
      route,
      requests: metrics.count,
      totalTime: metrics.totalTime,
      averageResponseTime: (metrics.totalTime / metrics.count).toFixed(1)
    };
  }

  /**
   * Middleware to add performance headers
   */
  addPerformanceHeaders() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        res.set('X-Response-Time', `${responseTime}ms`);
      });

      next();
    };
  }

  /**
   * Express route to get performance metrics
   */
  getMetricsRoute() {
    return (req, res) => {
      const stats = this.getStats();
      const slowQueries = this.getSlowQueries(10);

      res.json({
        success: true,
        data: {
          overview: {
            totalRequests: stats.totalRequests,
            averageResponseTime: stats.averageResponseTime,
            slowQueriesCount: stats.slowQueries
          },
          routes: stats.routes.slice(0, 10), // Top 10 slowest routes
          slowQueries,
          timestamp: new Date().toISOString()
        }
      });
    };
  }

  /**
   * Database query performance tracking
   */
  trackDatabaseQuery(operation, collection, query, responseTime) {
    if (responseTime > this.slowQueryThreshold) {
      const slowDbQuery = {
        timestamp: new Date().toISOString(),
        operation,
        collection,
        query: JSON.stringify(query),
        responseTime,
        type: 'database'
      };

      this.metrics.slowQueries.push(slowDbQuery);
      console.warn(`SLOW DB QUERY: ${operation} on ${collection} - ${responseTime}ms`);
    }
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

module.exports = performanceMonitor;