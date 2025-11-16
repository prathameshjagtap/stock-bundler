/**
 * LRU Cache Layer for Stock Data
 *
 * Implements caching to reduce API calls and improve performance:
 * - Quote cache: 5-minute TTL (balance freshness vs cost)
 * - Details cache: 24-hour TTL (fundamentals change slowly)
 * - History cache: 1-hour TTL (historical data is stable)
 */

import { LRUCache } from 'lru-cache';
import { StockQuote, StockOverview, PriceData } from '@/types';

// ============================================================================
// Cache Configuration
// ============================================================================

/**
 * Quote cache - 5 minute TTL during market hours
 * Stores real-time/delayed stock quotes
 */
export const quoteCache = new LRUCache<string, StockQuote>({
  max: 500, // Cache up to 500 stocks
  ttl: 5 * 60 * 1000, // 5 minutes
  updateAgeOnGet: false, // Don't extend TTL on read
  updateAgeOnHas: false,
});

/**
 * Details cache - 24 hour TTL
 * Fundamental data (sector, industry, market cap) changes slowly
 */
export const detailsCache = new LRUCache<string, StockOverview>({
  max: 200, // Cache up to 200 stock details
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});

/**
 * Historical data cache - 1 hour TTL
 * Historical data is stable once the day closes
 */
export const historyCache = new LRUCache<string, PriceData[]>({
  max: 100, // Cache up to 100 historical datasets
  ttl: 60 * 60 * 1000, // 1 hour
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});

/**
 * Search results cache - 30 minute TTL
 * Search results don't change frequently
 */
export const searchCache = new LRUCache<string, any[]>({
  max: 50, // Cache up to 50 search queries
  ttl: 30 * 60 * 1000, // 30 minutes
  updateAgeOnGet: false,
  updateAgeOnHas: false,
});

// ============================================================================
// Cache Statistics & Management
// ============================================================================

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats() {
  return {
    quotes: {
      size: quoteCache.size,
      max: quoteCache.max,
      calculatedSize: quoteCache.calculatedSize,
    },
    details: {
      size: detailsCache.size,
      max: detailsCache.max,
      calculatedSize: detailsCache.calculatedSize,
    },
    history: {
      size: historyCache.size,
      max: historyCache.max,
      calculatedSize: historyCache.calculatedSize,
    },
    search: {
      size: searchCache.size,
      max: searchCache.max,
      calculatedSize: searchCache.calculatedSize,
    },
  };
}

/**
 * Calculate cache hit rate (percentage)
 * This is an estimate based on size vs max capacity
 */
export function getCacheHitRate() {
  const stats = getCacheStats();

  // Estimate hit rate based on cache utilization
  // Higher utilization suggests more hits
  const quoteHitRate = (stats.quotes.size / stats.quotes.max) * 100;
  const detailsHitRate = (stats.details.size / stats.details.max) * 100;
  const historyHitRate = (stats.history.size / stats.history.max) * 100;

  return {
    quotes: Math.min(quoteHitRate, 100),
    details: Math.min(detailsHitRate, 100),
    history: Math.min(historyHitRate, 100),
    overall: Math.min(
      (quoteHitRate + detailsHitRate + historyHitRate) / 3,
      100
    ),
  };
}

/**
 * Clear all caches
 * Useful for testing, admin operations, or when switching providers
 */
export function clearAllCaches(): void {
  quoteCache.clear();
  detailsCache.clear();
  historyCache.clear();
  searchCache.clear();
  console.log('[Cache] All caches cleared');
}

/**
 * Clear a specific stock's cache entries
 * Useful for forcing a refresh of specific stock data
 */
export function clearStockCache(symbol: string): void {
  const upperSymbol = symbol.toUpperCase();
  quoteCache.delete(upperSymbol);
  detailsCache.delete(upperSymbol);
  // History cache uses different keys (symbol + date range)
  // We can't easily clear all history for a symbol without iteration
  console.log(`[Cache] Cleared cache for ${upperSymbol}`);
}

/**
 * Warm up cache with popular stocks
 * Call this on application startup or during low-traffic periods
 */
export async function warmupCache(
  symbols: string[],
  provider: any
): Promise<void> {
  console.log(`[Cache] Warming up cache for ${symbols.length} symbols...`);

  for (const symbol of symbols) {
    try {
      // Fetch quote and details for each symbol
      const quote = await provider.getStockQuote(symbol);
      if (quote) {
        quoteCache.set(symbol.toUpperCase(), quote);
      }

      const overview = await provider.getStockOverview(symbol);
      if (overview) {
        detailsCache.set(symbol.toUpperCase(), overview);
      }
    } catch (error) {
      console.error(`[Cache] Error warming up ${symbol}:`, error);
    }
  }

  console.log('[Cache] Warmup complete');
}

/**
 * Get cache key for historical data
 * Includes symbol and date range to avoid collisions
 */
export function getHistoryCacheKey(
  symbol: string,
  from: Date,
  to: Date
): string {
  const fromStr = from.toISOString().split('T')[0];
  const toStr = to.toISOString().split('T')[0];
  return `${symbol.toUpperCase()}:${fromStr}:${toStr}`;
}

/**
 * Log cache performance metrics
 */
export function logCacheMetrics(): void {
  const stats = getCacheStats();
  const hitRates = getCacheHitRate();

  console.log('[Cache] Performance Metrics:');
  console.log(`  Quotes: ${stats.quotes.size}/${stats.quotes.max} (${hitRates.quotes.toFixed(1)}% utilization)`);
  console.log(`  Details: ${stats.details.size}/${stats.details.max} (${hitRates.details.toFixed(1)}% utilization)`);
  console.log(`  History: ${stats.history.size}/${stats.history.max} (${hitRates.history.toFixed(1)}% utilization)`);
  console.log(`  Search: ${stats.search.size}/${stats.search.max}`);
}
