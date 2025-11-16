export interface Stock {
  id: string;
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  currentPrice: number;
  lastUpdated: Date;
}

export interface ETF {
  id: string;
  ticker: string;
  name: string;
  description?: string;
  weightingMethod: 'MARKET_CAP' | 'PRICE_WEIGHTED' | 'EQUAL';
  isCustom: boolean;
  currentValue?: number;
  compositions?: ETFComposition[];
}

export interface ETFComposition {
  id: string;
  etfId: string;
  stockId: string;
  weight: number;
  shares?: number;
  stock?: Stock;
}

export interface UserETF {
  id: string;
  userId: string;
  etfId: string;
  customName?: string;
  notes?: string;
  etf: ETF;
}

export interface PriceHistory {
  id: string;
  stockId: string;
  price: number;
  volume?: bigint;
  timestamp: Date;
}

export interface ETFHistory {
  id: string;
  etfId: string;
  value: number;
  timestamp: Date;
}

export interface CreateETFInput {
  ticker: string;
  name: string;
  description?: string;
  weightingMethod: 'MARKET_CAP' | 'PRICE_WEIGHTED' | 'EQUAL';
  stocks: Array<{
    symbol: string;
    weight?: number;
  }>;
}

export interface UpdateETFCompositionInput {
  etfId: string;
  addStocks?: string[];
  removeStocks?: string[];
}

// Re-export Massive.com API types
export type {
  StockQuote,
  StockOverview,
  PriceData,
  SearchResult,
  MassiveApiResponse,
  MassivePreviousDayBar,
  MassiveTickerDetails,
  MassiveTickerSearchResult,
  MassiveAggregateBar,
} from './massive';

// Export class and enum (not as type, since they're used as values)
export { MassiveApiError, MassiveErrorType } from './massive';
