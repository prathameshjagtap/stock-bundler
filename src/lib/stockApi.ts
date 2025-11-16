import axios from 'axios';

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;

// Rate limiting: Alpha Vantage free tier allows 5 API requests per minute and 500 requests per day
const RATE_LIMIT_DELAY = 12000; // 12 seconds between requests
let lastRequestTime = 0;

async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }

  lastRequestTime = Date.now();
}

export interface StockQuote {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
}

export interface StockOverview {
  symbol: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
}

/**
 * Fetch real-time stock quote from Alpha Vantage
 */
export async function getStockQuote(symbol: string): Promise<StockQuote | null> {
  await rateLimit();

  try {
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'GLOBAL_QUOTE',
        symbol: symbol,
        apikey: API_KEY,
      },
    });

    const quote = response.data['Global Quote'];

    if (!quote || Object.keys(quote).length === 0) {
      console.error(`No quote data found for ${symbol}`);
      return null;
    }

    return {
      symbol: quote['01. symbol'],
      price: parseFloat(quote['05. price']),
      volume: parseInt(quote['06. volume']),
      timestamp: new Date(quote['07. latest trading day']),
    };
  } catch (error) {
    console.error(`Error fetching quote for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch company overview from Alpha Vantage
 */
export async function getStockOverview(symbol: string): Promise<StockOverview | null> {
  await rateLimit();

  try {
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'OVERVIEW',
        symbol: symbol,
        apikey: API_KEY,
      },
    });

    const overview = response.data;

    if (!overview || !overview.Symbol) {
      console.error(`No overview data found for ${symbol}`);
      return null;
    }

    return {
      symbol: overview.Symbol,
      name: overview.Name,
      sector: overview.Sector,
      industry: overview.Industry,
      marketCap: parseFloat(overview.MarketCapitalization) || 0,
    };
  } catch (error) {
    console.error(`Error fetching overview for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch historical daily prices for a stock
 */
export async function getHistoricalPrices(
  symbol: string,
  outputSize: 'compact' | 'full' = 'compact'
): Promise<Array<{ date: Date; price: number; volume: number }>> {
  await rateLimit();

  try {
    const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
      params: {
        function: 'TIME_SERIES_DAILY',
        symbol: symbol,
        outputsize: outputSize,
        apikey: API_KEY,
      },
    });

    const timeSeries = response.data['Time Series (Daily)'];

    if (!timeSeries) {
      console.error(`No historical data found for ${symbol}`);
      return [];
    }

    return Object.entries(timeSeries).map(([date, data]: [string, any]) => ({
      date: new Date(date),
      price: parseFloat(data['4. close']),
      volume: parseInt(data['5. volume']),
    }));
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return [];
  }
}

/**
 * Batch fetch quotes for multiple symbols with rate limiting
 */
export async function batchGetStockQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const quotes = new Map<string, StockQuote>();

  for (const symbol of symbols) {
    const quote = await getStockQuote(symbol);
    if (quote) {
      quotes.set(symbol, quote);
    }
  }

  return quotes;
}

// ============================================================================
// Provider Wrapper for Abstraction Layer
// ============================================================================

import { StockDataProvider } from './stockDataProvider';
import { PriceData, SearchResult } from '@/types';

/**
 * Alpha Vantage provider implementation
 * Wraps the existing Alpha Vantage functions into the StockDataProvider interface
 */
export class AlphaVantageProvider implements StockDataProvider {
  getName(): string {
    return 'Alpha Vantage';
  }

  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    return getStockQuote(symbol);
  }

  async getStockOverview(symbol: string): Promise<StockOverview | null> {
    return getStockOverview(symbol);
  }

  async getHistoricalPrices(
    symbol: string,
    params: { from: Date; to: Date }
  ): Promise<PriceData[]> {
    // Alpha Vantage doesn't support date range filtering directly
    // We fetch all data and filter client-side
    const allPrices = await getHistoricalPrices(symbol, 'full');

    return allPrices
      .filter(p => p.date >= params.from && p.date <= params.to)
      .map(p => ({
        date: p.date,
        price: p.price,
        volume: p.volume,
      }));
  }

  async searchStocks(query: string): Promise<SearchResult[]> {
    // Alpha Vantage free tier doesn't have a search endpoint
    // Return empty array - search will fall back to database
    console.warn('[AlphaVantage] Search not supported, use database fallback');
    return [];
  }

  async batchGetQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
    return batchGetStockQuotes(symbols);
  }
}
