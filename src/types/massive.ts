/**
 * Massive.com (formerly Polygon.io) API Type Definitions
 * Based on API documentation at https://massive.com/docs
 */

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface MassiveApiResponse<T> {
  status: string;
  request_id?: string;
  count?: number;
  results?: T;
  resultsCount?: number;
  queryCount?: number;
  adjusted?: boolean;
}

/**
 * Previous Day Aggregate Bar (OHLC) Response
 * Endpoint: GET /v2/aggs/ticker/{ticker}/prev
 */
export interface MassivePreviousDayBar {
  c: number;  // Close price
  h: number;  // High price
  l: number;  // Low price
  o: number;  // Open price
  t: number;  // Unix timestamp (milliseconds)
  v: number;  // Trading volume
  vw?: number; // Volume weighted average price
  n?: number;  // Number of transactions
}

/**
 * Ticker Details Response
 * Endpoint: GET /v3/reference/tickers/{ticker}
 */
export interface MassiveTickerDetails {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange?: string;
  type?: string;
  active: boolean;
  currency_name?: string;
  cik?: string;
  composite_figi?: string;
  share_class_figi?: string;
  market_cap?: number;
  phone_number?: string;
  address?: {
    address1?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
  description?: string;
  sic_code?: string;
  sic_description?: string;
  ticker_root?: string;
  homepage_url?: string;
  total_employees?: number;
  list_date?: string;
  branding?: {
    logo_url?: string;
    icon_url?: string;
  };
  share_class_shares_outstanding?: number;
  weighted_shares_outstanding?: number;
  round_lot?: number;
}

/**
 * Ticker Search Result
 * Endpoint: GET /v3/reference/tickers
 */
export interface MassiveTickerSearchResult {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange?: string;
  type?: string;
  active: boolean;
  currency_name?: string;
  cik?: string;
  composite_figi?: string;
  last_updated_utc?: string;
}

/**
 * Aggregate Bars (Historical OHLC) Response
 * Endpoint: GET /v2/aggs/ticker/{ticker}/range/{multiplier}/{timespan}/{from}/{to}
 */
export interface MassiveAggregateBar {
  c: number;  // Close price
  h: number;  // High price
  l: number;  // Low price
  o: number;  // Open price
  t: number;  // Unix timestamp (milliseconds)
  v: number;  // Trading volume
  vw?: number; // Volume weighted average price
  n?: number;  // Number of transactions
}

// ============================================================================
// Internal Application Types (shared with stockApi.ts)
// ============================================================================

/**
 * Normalized stock quote for internal use
 */
export interface StockQuote {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
  open?: number;
  high?: number;
  low?: number;
  vwap?: number;
}

/**
 * Normalized stock overview for internal use
 */
export interface StockOverview {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  description?: string;
  exchange?: string;
  homepage?: string;
  employees?: number;
}

/**
 * Historical price data point
 */
export interface PriceData {
  date: Date;
  price: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
}

/**
 * Search result item
 */
export interface SearchResult {
  symbol: string;
  name: string;
  type?: string;
  exchange?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export enum MassiveErrorType {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT',
  INVALID_API_KEY = 'INVALID_KEY',
  SYMBOL_NOT_FOUND = 'NOT_FOUND',
  NETWORK_ERROR = 'NETWORK',
  SERVER_ERROR = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

export class MassiveApiError extends Error {
  constructor(
    public type: MassiveErrorType,
    message: string,
    public statusCode?: number,
    public retryAfter?: number
  ) {
    super(message);
    this.name = 'MassiveApiError';
  }
}
