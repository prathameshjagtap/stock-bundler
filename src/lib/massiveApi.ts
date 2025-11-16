/**
 * Massive.com (formerly Polygon.io) API Client
 *
 * Comprehensive client for Massive.com Stocks API with:
 * - HTTP request/response handling with retry logic
 * - Response transformation to internal types
 * - Integrated caching layer
 * - Error handling and logging
 * - Rate limiting (though Stocks Starter plan has unlimited calls)
 *
 * API Documentation: https://massive.com/docs/stocks
 */

import axios, { AxiosError } from 'axios';
import { StockDataProvider } from './stockDataProvider';
import {
  StockQuote,
  StockOverview,
  PriceData,
  SearchResult,
  MassiveApiResponse,
  MassivePreviousDayBar,
  MassiveTickerDetails,
  MassiveTickerSearchResult,
  MassiveAggregateBar,
  MassiveApiError,
  MassiveErrorType,
} from '@/types';
import {
  quoteCache,
  detailsCache,
  historyCache,
  searchCache,
  getHistoryCacheKey,
} from './cache';

// ============================================================================
// Configuration
// ============================================================================

const MASSIVE_BASE_URL = process.env.MASSIVE_BASE_URL || 'https://api.massive.com';
const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY;

// Verify API key is configured
if (!MASSIVE_API_KEY) {
  console.warn('[Massive] MASSIVE_API_KEY not configured. API calls will fail.');
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sleep helper for retry logic
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * HTTP client with retry logic for transient failures
 */
async function fetchWithRetry<T>(
  url: string,
  maxRetries = 3
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${MASSIVE_API_KEY}`,
        },
        timeout: 10000, // 10 second timeout
      });

      if (response.status === 200) {
        return response.data;
      }

      // Rate limit (429) - wait and retry
      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers['retry-after'] || '60'
        );
        console.warn(
          `[Massive] Rate limited, retrying after ${retryAfter}s (attempt ${attempt + 1}/${maxRetries})`
        );
        await sleep(retryAfter * 1000);
        continue;
      }

      // Server error (5xx) - retry with exponential backoff
      if (response.status >= 500) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(
          `[Massive] Server error ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`
        );
        await sleep(delay);
        continue;
      }

      // Client error (4xx) - don't retry
      throw new MassiveApiError(
        response.status === 401 || response.status === 403
          ? MassiveErrorType.INVALID_API_KEY
          : response.status === 404
          ? MassiveErrorType.SYMBOL_NOT_FOUND
          : MassiveErrorType.UNKNOWN,
        `API error: ${response.status} ${response.statusText}`,
        response.status
      );
    } catch (error) {
      // Network error or last attempt
      if (attempt === maxRetries - 1) {
        if (axios.isAxiosError(error)) {
          const axiosError = error as AxiosError;
          if (axiosError.response) {
            // Server responded with error status
            throw new MassiveApiError(
              axiosError.response.status === 404
                ? MassiveErrorType.SYMBOL_NOT_FOUND
                : MassiveErrorType.SERVER_ERROR,
              `API request failed: ${axiosError.response.status} ${axiosError.response.statusText}`,
              axiosError.response.status
            );
          } else if (axiosError.request) {
            // Request made but no response
            throw new MassiveApiError(
              MassiveErrorType.NETWORK_ERROR,
              'Network error: No response from server',
              undefined
            );
          }
        }
        throw new MassiveApiError(
          MassiveErrorType.UNKNOWN,
          `Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Retry with exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      await sleep(delay);
    }
  }

  throw new MassiveApiError(
    MassiveErrorType.NETWORK_ERROR,
    'Max retries exceeded'
  );
}

// ============================================================================
// Massive.com Provider Implementation
// ============================================================================

export class MassiveProvider implements StockDataProvider {
  getName(): string {
    return 'Massive.com';
  }

  /**
   * Get stock quote (previous day close)
   * Uses /v2/aggs/ticker/{ticker}/prev endpoint
   */
  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    const upperSymbol = symbol.toUpperCase();

    // Check cache first
    const cached = quoteCache.get(upperSymbol);
    if (cached) {
      console.log(`[Massive] Cache hit for quote: ${upperSymbol}`);
      return cached;
    }

    try {
      console.log(`[Massive] Fetching quote for ${upperSymbol}`);

      const url = `${MASSIVE_BASE_URL}/v2/aggs/ticker/${upperSymbol}/prev?adjusted=true`;
      const data = await fetchWithRetry<MassiveApiResponse<MassivePreviousDayBar[]>>(url);

      if (!data.results || data.results.length === 0) {
        console.warn(`[Massive] No quote data found for ${upperSymbol}`);
        return null;
      }

      // Transform to internal format
      const bar = data.results[0];
      const quote: StockQuote = {
        symbol: upperSymbol,
        price: bar.c, // Close price
        volume: bar.v,
        timestamp: new Date(bar.t),
        open: bar.o,
        high: bar.h,
        low: bar.l,
        vwap: bar.vw,
      };

      // Cache the result
      quoteCache.set(upperSymbol, quote);

      return quote;
    } catch (error) {
      if (
        error instanceof MassiveApiError &&
        error.type === MassiveErrorType.SYMBOL_NOT_FOUND
      ) {
        console.warn(`[Massive] Symbol not found: ${upperSymbol}`);
        return null;
      }
      console.error(`[Massive] Error fetching quote for ${upperSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Get stock overview (company details)
   * Uses /v3/reference/tickers/{ticker} endpoint
   */
  async getStockOverview(symbol: string): Promise<StockOverview | null> {
    const upperSymbol = symbol.toUpperCase();

    // Check cache first
    const cached = detailsCache.get(upperSymbol);
    if (cached) {
      console.log(`[Massive] Cache hit for overview: ${upperSymbol}`);
      return cached;
    }

    try {
      console.log(`[Massive] Fetching overview for ${upperSymbol}`);

      const url = `${MASSIVE_BASE_URL}/v3/reference/tickers/${upperSymbol}`;
      const data = await fetchWithRetry<MassiveApiResponse<MassiveTickerDetails>>(url);

      if (!data.results) {
        console.warn(`[Massive] No overview data found for ${upperSymbol}`);
        return null;
      }

      // Transform to internal format
      const ticker = data.results;
      const overview: StockOverview = {
        symbol: upperSymbol,
        name: ticker.name,
        sector: ticker.sic_description,
        industry: ticker.sic_description, // Massive uses SIC code for classification
        marketCap: ticker.market_cap,
        description: ticker.description,
        exchange: ticker.primary_exchange,
        homepage: ticker.homepage_url,
        employees: ticker.total_employees,
      };

      // Cache the result
      detailsCache.set(upperSymbol, overview);

      return overview;
    } catch (error) {
      if (
        error instanceof MassiveApiError &&
        error.type === MassiveErrorType.SYMBOL_NOT_FOUND
      ) {
        console.warn(`[Massive] Symbol not found: ${upperSymbol}`);
        return null;
      }
      console.error(`[Massive] Error fetching overview for ${upperSymbol}:`, error);
      throw error;
    }
  }

  /**
   * Get historical price data
   * Uses /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to} endpoint
   */
  async getHistoricalPrices(
    symbol: string,
    params: { from: Date; to: Date }
  ): Promise<PriceData[]> {
    const upperSymbol = symbol.toUpperCase();
    const cacheKey = getHistoryCacheKey(upperSymbol, params.from, params.to);

    // Check cache first
    const cached = historyCache.get(cacheKey);
    if (cached) {
      console.log(`[Massive] Cache hit for history: ${upperSymbol}`);
      return cached;
    }

    try {
      console.log(`[Massive] Fetching historical data for ${upperSymbol}`);

      // Format dates as YYYY-MM-DD
      const fromStr = params.from.toISOString().split('T')[0];
      const toStr = params.to.toISOString().split('T')[0];

      // 1 day bars
      const url = `${MASSIVE_BASE_URL}/v2/aggs/ticker/${upperSymbol}/range/1/day/${fromStr}/${toStr}?adjusted=true&sort=asc`;
      const data = await fetchWithRetry<MassiveApiResponse<MassiveAggregateBar[]>>(url);

      if (!data.results || data.results.length === 0) {
        console.warn(`[Massive] No historical data found for ${upperSymbol}`);
        return [];
      }

      // Transform to internal format
      const priceData: PriceData[] = data.results.map((bar) => ({
        date: new Date(bar.t),
        price: bar.c, // Close price
        volume: bar.v,
        open: bar.o,
        high: bar.h,
        low: bar.l,
      }));

      // Cache the result
      historyCache.set(cacheKey, priceData);

      return priceData;
    } catch (error) {
      if (
        error instanceof MassiveApiError &&
        error.type === MassiveErrorType.SYMBOL_NOT_FOUND
      ) {
        console.warn(`[Massive] Symbol not found: ${upperSymbol}`);
        return [];
      }
      console.error(
        `[Massive] Error fetching historical data for ${upperSymbol}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Search for stocks by symbol or name
   * Uses /v3/reference/tickers endpoint with search parameter
   */
  async searchStocks(query: string): Promise<SearchResult[]> {
    if (!query || query.length < 1) {
      return [];
    }

    const cacheKey = `search:${query.toLowerCase()}`;

    // Check cache first
    const cached = searchCache.get(cacheKey);
    if (cached) {
      console.log(`[Massive] Cache hit for search: ${query}`);
      return cached;
    }

    try {
      console.log(`[Massive] Searching for: ${query}`);

      const url = `${MASSIVE_BASE_URL}/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&limit=10&market=stocks`;
      const data = await fetchWithRetry<MassiveApiResponse<MassiveTickerSearchResult[]>>(url);

      if (!data.results || data.results.length === 0) {
        console.log(`[Massive] No search results for: ${query}`);
        return [];
      }

      // Transform to internal format
      const results: SearchResult[] = data.results.map((ticker) => ({
        symbol: ticker.ticker,
        name: ticker.name,
        type: ticker.type,
        exchange: ticker.primary_exchange,
      }));

      // Cache the results
      searchCache.set(cacheKey, results);

      return results;
    } catch (error) {
      console.error(`[Massive] Error searching for ${query}:`, error);
      // Return empty array on search errors (graceful degradation)
      return [];
    }
  }

  /**
   * Batch get quotes for multiple symbols
   * Note: Massive.com doesn't have a native batch endpoint,
   * but with unlimited API calls on Stocks Starter, we can fetch in parallel
   */
  async batchGetQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    const quotes = new Map<string, StockQuote>();

    // Fetch all quotes in parallel (no rate limiting needed with Stocks Starter)
    const promises = symbols.map(async (symbol) => {
      try {
        const quote = await this.getStockQuote(symbol);
        if (quote) {
          quotes.set(symbol.toUpperCase(), quote);
        }
      } catch (error) {
        console.error(`[Massive] Error in batch fetch for ${symbol}:`, error);
      }
    });

    await Promise.all(promises);

    return quotes;
  }
}
