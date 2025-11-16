/**
 * Stock Data Provider Abstraction Layer
 *
 * This abstraction layer allows switching between different stock data providers
 * (Alpha Vantage, Massive.com, etc.) via environment configuration without code changes.
 *
 * Benefits:
 * - Instant rollback without code changes
 * - A/B testing capability
 * - Zero-downtime migration
 * - Easy provider comparison
 */

import { StockQuote, StockOverview, PriceData, SearchResult } from '@/types';

/**
 * Interface that all stock data providers must implement
 */
export interface StockDataProvider {
  /**
   * Get real-time or delayed quote for a single stock
   * @param symbol - Stock ticker symbol (e.g., 'AAPL')
   * @returns Stock quote or null if not found
   */
  getStockQuote(symbol: string): Promise<StockQuote | null>;

  /**
   * Get detailed stock information (company overview)
   * @param symbol - Stock ticker symbol
   * @returns Stock overview or null if not found
   */
  getStockOverview(symbol: string): Promise<StockOverview | null>;

  /**
   * Get historical price data for a stock
   * @param symbol - Stock ticker symbol
   * @param params - Date range parameters
   * @returns Array of historical price data points
   */
  getHistoricalPrices(
    symbol: string,
    params: { from: Date; to: Date }
  ): Promise<PriceData[]>;

  /**
   * Search for stocks by symbol or name
   * @param query - Search query (symbol or company name)
   * @returns Array of matching stocks
   */
  searchStocks(query: string): Promise<SearchResult[]>;

  /**
   * Batch get quotes for multiple symbols (optional optimization)
   * @param symbols - Array of stock ticker symbols
   * @returns Map of symbol to quote
   */
  batchGetQuotes?(symbols: string[]): Promise<Map<string, StockQuote>>;

  /**
   * Get provider name for logging/debugging
   */
  getName(): string;
}

/**
 * Factory function to get the configured stock data provider
 *
 * Provider is selected via STOCK_DATA_PROVIDER environment variable:
 * - 'massive' -> Massive.com API
 * - 'alpha_vantage' -> Alpha Vantage API (legacy)
 *
 * @returns Configured stock data provider instance
 * @throws Error if provider is unknown or not configured
 */
export function getStockProvider(): StockDataProvider {
  const provider = process.env.STOCK_DATA_PROVIDER || 'massive';

  console.log(`[StockProvider] Using provider: ${provider}`);

  switch (provider.toLowerCase()) {
    case 'massive':
      // Dynamically import to avoid circular dependencies
      const { MassiveProvider } = require('./massiveApi');
      return new MassiveProvider();

    case 'alpha_vantage':
      const { AlphaVantageProvider } = require('./stockApi');
      return new AlphaVantageProvider();

    default:
      throw new Error(
        `Unknown stock data provider: ${provider}. ` +
        `Valid options: 'massive', 'alpha_vantage'`
      );
  }
}

/**
 * Singleton instance cache to reuse provider instances
 */
let cachedProvider: StockDataProvider | null = null;

/**
 * Get the stock provider with singleton caching
 * This ensures we reuse the same provider instance across the application
 */
export function getStockProviderSingleton(): StockDataProvider {
  if (!cachedProvider) {
    cachedProvider = getStockProvider();
  }
  return cachedProvider;
}

/**
 * Clear the cached provider instance (useful for testing)
 */
export function clearProviderCache(): void {
  cachedProvider = null;
}
