# Massive.com (Polygon) API Migration Plan

**Project:** Stock Bundler ETF Management Platform
**Migration:** Alpha Vantage → Massive.com (formerly Polygon)
**Timeline:** 7 Days (Critical Priority)
**Strategy:** Abstraction Layer Pattern (Safe Rollback)
**Date Created:** 2025-11-08

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Migration Architecture](#migration-architecture)
4. [Implementation Plan](#implementation-plan)
5. [Files to Create/Modify](#files-to-createmodify)
6. [Testing Strategy](#testing-strategy)
7. [Deployment & Rollback](#deployment--rollback)
8. [Monitoring & Success Criteria](#monitoring--success-criteria)
9. [Risk Assessment](#risk-assessment)
10. [Timeline & Milestones](#timeline--milestones)

---

## Executive Summary

### Why Migrate?

Migrating from Alpha Vantage to Massive.com (formerly Polygon) for stock and ETF data fetching to improve:
- Higher rate limits with Stock Starter plan
- Better data quality and reliability
- More comprehensive API endpoints
- Better documentation and support
- Potential for real-time data access

### Migration Strategy

**Abstraction Layer Pattern** - Implement a provider interface that allows switching between Alpha Vantage and Massive.com via configuration, enabling:
- ✅ Instant rollback without code changes
- ✅ A/B testing capability
- ✅ Zero-downtime migration
- ✅ Gradual transition if needed

### Key Decisions

- **Timeline:** 7 days (critical priority)
- **Approach:** Abstraction layer (keep both providers)
- **Rate Limits:** To be determined from Massive.com Stock Starter plan docs
- **Web Access:** MCP (Model Context Protocol) for documentation fetching
- **Caching:** LRU cache with 5-min TTL for quotes, 24-hour for details

---

## Current State Analysis

### Existing Alpha Vantage Integration

**Files Currently Using Alpha Vantage:**

1. **`/src/lib/stockApi.ts`** - Main API integration file
   - Functions: `getStockQuote()`, `getStockOverview()`, `getHistoricalPrices()`
   - Rate limiting: 5 requests/minute, 500/day
   - Delay: 12 seconds between requests

2. **`/src/app/api/stocks/update/route.ts`** - Cron job for price updates
   - Updates all stocks in database periodically
   - Protected with CRON_SECRET authentication

3. **`.env` / `.env.local`** - Configuration
   - `ALPHA_VANTAGE_API_KEY` environment variable

### Current API Endpoints Used

| Endpoint | Function | Usage |
|----------|----------|-------|
| `GLOBAL_QUOTE` | Real-time stock quote | Price updates |
| `OVERVIEW` | Company overview | Stock details (sector, industry, marketCap) |
| `TIME_SERIES_DAILY` | Historical prices | Price history data |

### Database Schema

**Stock Model:**
```prisma
model Stock {
  id            String    @id @default(cuid())
  symbol        String    @unique
  name          String
  sector        String?
  industry      String?
  marketCap     Float?
  currentPrice  Float
  lastUpdated   DateTime  @default(now())
  createdAt     DateTime  @default(now())

  etfCompositions  ETFComposition[]
  priceHistory     PriceHistory[]
}
```

**PriceHistory Model:**
```prisma
model PriceHistory {
  id            String    @id @default(cuid())
  stockId       String
  price         Float
  volume        BigInt?
  timestamp     DateTime  @default(now())

  stock         Stock     @relation(fields: [stockId], references: [id])
}
```

### Current Limitations

- **Rate Limits:** 5 requests/minute max (very restrictive)
- **Bulk Updates:** Takes 10+ minutes to update 50 stocks
- **Daily Quota:** May hit 500/day limit with active users
- **No Search:** No symbol search endpoint available
- **No Batch Quotes:** Must fetch one at a time

---

## Migration Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND LAYER                           │
│  - Dashboard (display prices)                                │
│  - ETF Create/View (stock selection)                         │
│  - Stock Search (user input)                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   API ROUTES LAYER                           │
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────┐         │
│  │ /api/stocks/search   │  │ /api/stocks/update   │         │
│  │ (user-triggered)     │  │ (cron-triggered)     │         │
│  └──────────┬───────────┘  └──────────┬───────────┘         │
│             │                          │                     │
└─────────────┼──────────────────────────┼─────────────────────┘
              │                          │
              ▼                          ▼
┌─────────────────────────────────────────────────────────────┐
│           ABSTRACTION LAYER (NEW)                            │
│                                                               │
│  ┌────────────────────────────────────────────────┐         │
│  │  /src/lib/stockDataProvider.ts                 │         │
│  │                                                 │         │
│  │  interface StockDataProvider {                 │         │
│  │    getStockQuote(symbol)                       │         │
│  │    getStockOverview(symbol)                    │         │
│  │    getHistoricalPrices(symbol, params)         │         │
│  │    searchStocks(query)                         │         │
│  │  }                                              │         │
│  │                                                 │         │
│  │  export function getStockProvider() {          │         │
│  │    return STOCK_DATA_PROVIDER === 'massive'    │         │
│  │      ? new MassiveProvider()                   │         │
│  │      : new AlphaVantageProvider();             │         │
│  │  }                                              │         │
│  └────────────┬───────────────┬───────────────────┘         │
│               │               │                              │
└───────────────┼───────────────┼──────────────────────────────┘
                │               │
    ┌───────────┘               └───────────┐
    ▼                                       ▼
┌─────────────────────┐         ┌─────────────────────┐
│  MassiveProvider    │         │ AlphaVantageProvider│
│  (NEW)              │         │ (LEGACY)            │
│                     │         │                     │
│ /src/lib/          │         │ /src/lib/           │
│   massiveApi.ts    │         │   stockApi.ts       │
└──────────┬──────────┘         └─────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                   CACHING LAYER                              │
│  - Quote cache (5-min TTL)                                   │
│  - Details cache (24-hour TTL)                               │
│  - History cache (1-hour TTL)                                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              MASSIVE.COM API                                 │
│  - Real-time/delayed quotes                                  │
│  - Stock details                                             │
│  - Historical data                                           │
│  - Symbol search                                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   POSTGRESQL DATABASE                        │
│  - Stock table (current prices)                              │
│  - PriceHistory table (historical data)                      │
│  - ETFHistory table (calculated values)                      │
└─────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

#### 1. Abstraction Layer (`stockDataProvider.ts`)

**Purpose:** Provide a unified interface for stock data regardless of provider

**Features:**
- Provider interface definition
- Factory function to get current provider
- Environment-based switching (`STOCK_DATA_PROVIDER`)
- Type safety across all providers

#### 2. Massive.com Client (`massiveApi.ts`)

**Purpose:** Handle all Massive.com API interactions

**Features:**
- HTTP request/response handling
- Rate limiting (based on Stock Starter plan)
- Response transformation (Massive API → internal types)
- Error handling with retry logic
- Request caching
- Request logging

#### 3. Caching Layer (`cache.ts`)

**Purpose:** Reduce API calls and improve performance

**Strategy:**
- **Quote Cache:** 5-minute TTL (balance freshness vs cost)
- **Details Cache:** 24-hour TTL (fundamentals change slowly)
- **History Cache:** 1-hour TTL (historical data is stable)
- **Cache Invalidation:** Manual refresh endpoints

**Implementation:** LRU (Least Recently Used) cache with `lru-cache` library

---

## Implementation Plan

### Phase 1: Setup & Research (Day 1 - Today)

#### 1.1 Install MCP for Web Access

**Goal:** Enable direct access to Massive.com documentation

**Steps:**
1. Add Fetch MCP server to Claude Code configuration:
```json
{
  "mcpServers": {
    "fetch": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-fetch"]
    }
  }
}
```
2. Restart Claude Code
3. Verify MCP server is running
4. Test with sample fetch

**Deliverable:** Working MCP access to web URLs

#### 1.2 Research Massive.com API

**Goal:** Understand API capabilities and limitations

**Research Checklist:**
- [ ] Read complete API documentation at https://massive.com/docs
- [ ] Identify endpoint for real-time/delayed stock quotes
- [ ] Identify endpoint for company/stock details
- [ ] Identify endpoint for historical price data
- [ ] Identify endpoint for stock symbol search
- [ ] Document Stock Starter plan rate limits (requests/minute, requests/day)
- [ ] Note data delay (real-time vs 15-minute delayed)
- [ ] Check batch quote support (multiple symbols in one request)
- [ ] Review authentication method (API key, bearer token, etc.)
- [ ] Test sample API calls with curl/Postman

**Deliverable:** API documentation summary with endpoint mappings

#### 1.3 Get Massive.com API Key

**Steps:**
1. Log into Massive.com account
2. Navigate to API Keys section
3. Generate new API key for Stock Bundler
4. Store securely (add to `.env` but NOT to git)

**Deliverable:** Working API key for Stock Starter plan

---

### Phase 2: Core Implementation (Day 2-3)

#### 2.1 Create Type Definitions

**File:** `/src/types/massive.ts` (NEW)

**Purpose:** Type-safe Massive.com API interactions

**Contents:**
```typescript
// Massive.com API Response Types (based on actual API docs)
export interface MassiveQuoteResponse {
  ticker: string;
  price: number;
  volume: number;
  timestamp: number;
  // ... other fields from API
}

export interface MassiveTickerDetails {
  ticker: string;
  name: string;
  market_cap: number;
  sector: string;
  industry: string;
  description?: string;
  // ... other fields from API
}

export interface MassiveHistoricalBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MassiveSearchResult {
  ticker: string;
  name: string;
  market: string;
  type: string; // 'stock', 'etf', etc.
}

// Internal types (existing)
export interface StockQuote {
  symbol: string;
  price: number;
  volume: number;
  timestamp: Date;
}

export interface StockOverview {
  symbol: string;
  name: string;
  sector?: string;
  industry?: string;
  marketCap?: number;
  description?: string;
}

export interface PriceData {
  date: Date;
  price: number;
  volume: number;
}
```

**Update:** `/src/types/index.ts` to export new types

#### 2.2 Implement Abstraction Layer

**File:** `/src/lib/stockDataProvider.ts` (NEW)

**Purpose:** Provider interface and factory function

**Implementation:**
```typescript
import { StockQuote, StockOverview, PriceData } from '@/types';

// Provider interface - all providers must implement this
export interface StockDataProvider {
  // Get real-time quote for a single stock
  getStockQuote(symbol: string): Promise<StockQuote | null>;

  // Get detailed stock information
  getStockOverview(symbol: string): Promise<StockOverview | null>;

  // Get historical price data
  getHistoricalPrices(
    symbol: string,
    params: { from: Date; to: Date }
  ): Promise<PriceData[]>;

  // Search for stocks by symbol or name
  searchStocks(query: string): Promise<Array<{ symbol: string; name: string }>>;

  // Batch get quotes (if supported by provider)
  batchGetQuotes?(symbols: string[]): Promise<Map<string, StockQuote>>;
}

// Factory function - returns the configured provider
export function getStockProvider(): StockDataProvider {
  const provider = process.env.STOCK_DATA_PROVIDER || 'massive';

  if (provider === 'massive') {
    return new MassiveProvider();
  } else if (provider === 'alpha_vantage') {
    return new AlphaVantageProvider();
  } else {
    throw new Error(`Unknown stock data provider: ${provider}`);
  }
}

// Re-export for convenience
export { MassiveProvider } from './massiveApi';
export { AlphaVantageProvider } from './stockApi';
```

**Deliverable:** Abstraction layer that supports provider switching

#### 2.3 Implement Massive.com Client

**File:** `/src/lib/massiveApi.ts` (NEW)

**Purpose:** Complete Massive.com API client

**Key Components:**

1. **Rate Limiter Class:**
```typescript
class MassiveRateLimiter {
  private lastRequestTime = 0;
  private dailyRequestCount = 0;
  private dailyResetTime = Date.now() + 24 * 60 * 60 * 1000;

  private REQUESTS_PER_MINUTE = parseInt(process.env.MASSIVE_RATE_LIMIT_PER_MINUTE || '5');
  private REQUESTS_PER_DAY = parseInt(process.env.MASSIVE_RATE_LIMIT_PER_DAY || '500');
  private MIN_DELAY_MS = (60 * 1000) / this.REQUESTS_PER_MINUTE;

  async waitForSlot(): Promise<void> {
    // Reset daily counter if needed
    if (Date.now() > this.dailyResetTime) {
      this.dailyRequestCount = 0;
      this.dailyResetTime = Date.now() + 24 * 60 * 60 * 1000;
    }

    // Check daily limit
    if (this.dailyRequestCount >= this.REQUESTS_PER_DAY) {
      throw new Error('Daily Massive.com API limit exceeded');
    }

    // Enforce per-minute rate limit
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.MIN_DELAY_MS) {
      await sleep(this.MIN_DELAY_MS - timeSinceLastRequest);
    }

    this.lastRequestTime = Date.now();
    this.dailyRequestCount++;
  }

  getStats() {
    return {
      dailyUsed: this.dailyRequestCount,
      dailyLimit: this.REQUESTS_PER_DAY,
      resetTime: new Date(this.dailyResetTime)
    };
  }
}
```

2. **Error Handling:**
```typescript
enum MassiveErrorType {
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT',
  INVALID_API_KEY = 'INVALID_KEY',
  SYMBOL_NOT_FOUND = 'NOT_FOUND',
  NETWORK_ERROR = 'NETWORK',
  SERVER_ERROR = 'SERVER',
  UNKNOWN = 'UNKNOWN'
}

class MassiveApiError extends Error {
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
```

3. **HTTP Client with Retry:**
```typescript
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      if (response.ok) return response;

      // Rate limit - wait and retry
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        console.warn(`Rate limited, retrying after ${retryAfter}s`);
        await sleep(retryAfter * 1000);
        continue;
      }

      // Server error - retry with exponential backoff
      if (response.status >= 500) {
        const delay = Math.pow(2, i) * 1000;
        console.warn(`Server error ${response.status}, retrying in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      // Client error - don't retry
      const errorType = response.status === 401 || response.status === 403
        ? MassiveErrorType.INVALID_API_KEY
        : response.status === 404
        ? MassiveErrorType.SYMBOL_NOT_FOUND
        : MassiveErrorType.UNKNOWN;

      throw new MassiveApiError(
        errorType,
        `API error: ${response.status} ${response.statusText}`,
        response.status
      );
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000);
    }
  }

  throw new MassiveApiError(
    MassiveErrorType.NETWORK_ERROR,
    'Max retries exceeded'
  );
}
```

4. **Main Provider Class:**
```typescript
export class MassiveProvider implements StockDataProvider {
  private rateLimiter = new MassiveRateLimiter();
  private baseUrl = process.env.MASSIVE_BASE_URL || 'https://api.massive.com';
  private apiKey = process.env.MASSIVE_API_KEY;

  constructor() {
    if (!this.apiKey) {
      throw new Error('MASSIVE_API_KEY environment variable is required');
    }
  }

  async getStockQuote(symbol: string): Promise<StockQuote | null> {
    // Check cache first
    const cached = quoteCache.get(symbol);
    if (cached) return cached;

    // Rate limit
    await this.rateLimiter.waitForSlot();

    try {
      // Fetch from API (URL will be determined from docs)
      const url = `${this.baseUrl}/v2/aggs/ticker/${symbol}/prev`;
      const response = await fetchWithRetry(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const data = await response.json();

      // Transform response to internal type
      const quote = this.transformQuote(data);

      // Cache result
      quoteCache.set(symbol, quote);

      return quote;
    } catch (error) {
      if (error instanceof MassiveApiError &&
          error.type === MassiveErrorType.SYMBOL_NOT_FOUND) {
        return null;
      }
      throw error;
    }
  }

  private transformQuote(data: MassiveQuoteResponse): StockQuote {
    return {
      symbol: data.ticker,
      price: data.price,
      volume: data.volume,
      timestamp: new Date(data.timestamp)
    };
  }

  // ... other methods (getStockOverview, getHistoricalPrices, searchStocks)
}
```

**Deliverable:** Complete, tested Massive.com API client

#### 2.4 Implement Caching Layer

**File:** `/src/lib/cache.ts` (NEW)

**Purpose:** LRU cache for API responses

**Implementation:**
```typescript
import { LRUCache } from 'lru-cache';
import { StockQuote, StockOverview, PriceData } from '@/types';

// Quote cache - 5 minute TTL during market hours
export const quoteCache = new LRUCache<string, StockQuote>({
  max: 500, // Cache up to 500 stocks
  ttl: 5 * 60 * 1000, // 5 minutes
  updateAgeOnGet: false, // Don't extend TTL on read
});

// Details cache - 24 hour TTL (fundamental data changes slowly)
export const detailsCache = new LRUCache<string, StockOverview>({
  max: 200,
  ttl: 24 * 60 * 60 * 1000, // 24 hours
  updateAgeOnGet: false,
});

// Historical data cache - 1 hour TTL
export const historyCache = new LRUCache<string, PriceData[]>({
  max: 100,
  ttl: 60 * 60 * 1000, // 1 hour
  updateAgeOnGet: false,
});

// Cache statistics
export function getCacheStats() {
  return {
    quotes: {
      size: quoteCache.size,
      max: quoteCache.max,
      hits: quoteCache.calculatedSize, // Approximate
    },
    details: {
      size: detailsCache.size,
      max: detailsCache.max,
    },
    history: {
      size: historyCache.size,
      max: historyCache.max,
    }
  };
}

// Clear all caches (useful for testing/admin)
export function clearAllCaches() {
  quoteCache.clear();
  detailsCache.clear();
  historyCache.clear();
}
```

**Deliverable:** Working cache layer with statistics

#### 2.5 Update Environment Configuration

**Files:** `.env` and `.env.local`

**Add:**
```env
# Massive.com API Configuration
MASSIVE_API_KEY="your-massive-api-key-here"
MASSIVE_BASE_URL="https://api.massive.com"  # Verify from docs
MASSIVE_RATE_LIMIT_PER_MINUTE=5  # Update based on Stock Starter plan
MASSIVE_RATE_LIMIT_PER_DAY=500   # Update based on Stock Starter plan

# Stock Data Provider Selection
STOCK_DATA_PROVIDER="massive"  # Options: "massive" or "alpha_vantage"

# Keep for rollback capability
ALPHA_VANTAGE_API_KEY="your-alpha-vantage-api-key"
```

**Update:** `.env.example` with documentation

**Deliverable:** Environment configuration for both providers

---

### Phase 3: Integration (Day 4)

#### 3.1 Update Stock Update Cron Job

**File:** `/src/app/api/stocks/update/route.ts` (MODIFY)

**Changes:**

**Before:**
```typescript
import { getStockQuote, getStockOverview } from '@/lib/stockApi';

export async function POST(request: Request) {
  // ... auth checks

  const stocks = await prisma.stock.findMany();

  for (const stock of stocks) {
    await sleep(12000); // Alpha Vantage rate limit
    const quote = await getStockQuote(stock.symbol);
    // ... update database
  }
}
```

**After:**
```typescript
import { getStockProvider } from '@/lib/stockDataProvider';

export async function POST(request: Request) {
  // ... auth checks

  const provider = getStockProvider();
  const stocks = await prisma.stock.findMany();

  for (const stock of stocks) {
    try {
      const quote = await provider.getStockQuote(stock.symbol);

      if (!quote) {
        console.warn(`No quote found for ${stock.symbol}`);
        continue;
      }

      // Update stock price
      await prisma.stock.update({
        where: { id: stock.id },
        data: {
          currentPrice: quote.price,
          lastUpdated: new Date()
        }
      });

      // Save to price history
      await prisma.priceHistory.create({
        data: {
          stockId: stock.id,
          price: quote.price,
          volume: quote.volume ? BigInt(quote.volume) : null,
          timestamp: quote.timestamp
        }
      });

    } catch (error) {
      console.error(`Error updating ${stock.symbol}:`, error);
      // Continue with other stocks
    }
  }

  return NextResponse.json({
    success: true,
    updated: stocks.length
  });
}
```

**Optimizations:**
- Remove 12-second delay (Massive.com has higher limits)
- Use provider's internal rate limiting
- Better error handling (don't fail entire job on one error)
- Consider batch processing if supported

**Deliverable:** Updated cron job using abstraction layer

#### 3.2 Enhance Stock Search Route

**File:** `/src/app/api/stocks/search/route.ts` (MODIFY)

**Current Behavior:** Only searches local database

**Enhanced Behavior:**
1. Search local database first (fast, no API cost)
2. If insufficient results, search Massive.com API
3. Automatically add new stocks to database

**Implementation:**
```typescript
import { getStockProvider } from '@/lib/stockDataProvider';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query too short' }, { status: 400 });
  }

  // 1. Search local database first
  const localResults = await prisma.stock.findMany({
    where: {
      OR: [
        { symbol: { contains: query, mode: 'insensitive' } },
        { name: { contains: query, mode: 'insensitive' } }
      ]
    },
    take: 10,
    orderBy: { symbol: 'asc' }
  });

  // 2. If we have enough results, return them
  if (localResults.length >= 5) {
    return NextResponse.json({
      results: localResults,
      source: 'database'
    });
  }

  // 3. Search API for additional results
  try {
    const provider = getStockProvider();
    const apiResults = await provider.searchStocks(query);

    // 4. Add new stocks to database (without full details yet)
    const newStocks = [];
    for (const result of apiResults) {
      const exists = localResults.find(s => s.symbol === result.symbol);
      if (!exists) {
        const created = await prisma.stock.create({
          data: {
            symbol: result.symbol,
            name: result.name,
            currentPrice: 0, // Will be updated by cron job
          }
        });
        newStocks.push(created);
      }
    }

    // 5. Combine and return results
    const combined = [...localResults, ...newStocks];

    return NextResponse.json({
      results: combined.slice(0, 10),
      source: 'combined',
      newStocksAdded: newStocks.length
    });

  } catch (error) {
    console.error('API search error:', error);
    // Fallback to local results only
    return NextResponse.json({
      results: localResults,
      source: 'database',
      error: 'API search failed'
    });
  }
}
```

**Benefits:**
- Fast response (database first)
- Automatic stock discovery
- Graceful fallback on API errors

**Deliverable:** Enhanced search with API integration

#### 3.3 Create Stock Details Endpoint

**File:** `/src/app/api/stocks/[symbol]/route.ts` (NEW)

**Purpose:** Fetch detailed stock information on-demand

**Implementation:**
```typescript
import { NextResponse } from 'next/server';
import { getStockProvider } from '@/lib/stockDataProvider';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  const { symbol } = params;

  try {
    // 1. Check database first
    const stock = await prisma.stock.findUnique({
      where: { symbol: symbol.toUpperCase() }
    });

    // 2. If stock exists and data is fresh (< 24h), return it
    if (stock && stock.lastUpdated) {
      const age = Date.now() - stock.lastUpdated.getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (age < oneDayMs) {
        return NextResponse.json({ stock });
      }
    }

    // 3. Fetch fresh data from API
    const provider = getStockProvider();
    const [quote, overview] = await Promise.all([
      provider.getStockQuote(symbol),
      provider.getStockOverview(symbol)
    ]);

    if (!quote || !overview) {
      return NextResponse.json(
        { error: 'Stock not found' },
        { status: 404 }
      );
    }

    // 4. Update or create stock in database
    const updatedStock = await prisma.stock.upsert({
      where: { symbol: symbol.toUpperCase() },
      update: {
        name: overview.name,
        sector: overview.sector,
        industry: overview.industry,
        marketCap: overview.marketCap,
        currentPrice: quote.price,
        lastUpdated: new Date()
      },
      create: {
        symbol: symbol.toUpperCase(),
        name: overview.name,
        sector: overview.sector,
        industry: overview.industry,
        marketCap: overview.marketCap,
        currentPrice: quote.price,
        lastUpdated: new Date()
      }
    });

    return NextResponse.json({ stock: updatedStock });

  } catch (error) {
    console.error(`Error fetching stock ${symbol}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch stock details' },
      { status: 500 }
    );
  }
}

// Force refresh endpoint
export async function POST(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  // Clear cache and fetch fresh data
  const { symbol } = params;

  // Clear from cache
  quoteCache.delete(symbol.toUpperCase());
  detailsCache.delete(symbol.toUpperCase());

  // Redirect to GET to fetch fresh data
  return GET(request, { params });
}
```

**Deliverable:** Stock details endpoint with caching

---

### Phase 4: Testing (Day 5)

#### 4.1 Unit Tests

**File:** `/src/lib/__tests__/massiveApi.test.ts` (NEW)

**Test Cases:**
```typescript
import { MassiveProvider } from '../massiveApi';

describe('MassiveProvider', () => {
  let provider: MassiveProvider;

  beforeEach(() => {
    process.env.MASSIVE_API_KEY = 'test-key';
    provider = new MassiveProvider();
  });

  describe('getStockQuote', () => {
    it('should fetch and transform quote data correctly', async () => {
      // Mock fetch response
      // Assert correct transformation
    });

    it('should return null for invalid symbol', async () => {
      // Mock 404 response
      const result = await provider.getStockQuote('INVALID');
      expect(result).toBeNull();
    });

    it('should use cache for repeated requests', async () => {
      // First call - API
      // Second call - cache
      // Assert only one API call made
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce per-minute limits', async () => {
      // Make requests faster than limit
      // Assert proper delays
    });

    it('should track daily usage', async () => {
      // Make requests
      // Check stats
    });
  });

  describe('Error Handling', () => {
    it('should retry on 500 errors', async () => {
      // Mock 500 then 200
      // Assert retry happened
    });

    it('should not retry on 404 errors', async () => {
      // Mock 404
      // Assert no retry
    });
  });
});
```

**Deliverable:** Comprehensive unit test suite

#### 4.2 Integration Tests

**File:** `/src/app/api/__tests__/stocks.integration.test.ts` (NEW)

**Test Scenarios:**
```typescript
describe('Stock API Integration', () => {
  describe('GET /api/stocks/search', () => {
    it('should search database first', async () => {
      // Add stock to database
      // Search for it
      // Assert found from database
    });

    it('should fall back to API when needed', async () => {
      // Search for unknown stock
      // Assert API was called
      // Assert stock added to database
    });
  });

  describe('POST /api/stocks/update', () => {
    it('should update all stocks', async () => {
      // Add stocks to database
      // Call update endpoint
      // Assert all updated
    });

    it('should handle partial failures', async () => {
      // Add valid and invalid stocks
      // Call update
      // Assert valid stocks updated
    });
  });

  describe('GET /api/stocks/[symbol]', () => {
    it('should return cached data when fresh', async () => {
      // Create stock with recent lastUpdated
      // Fetch details
      // Assert no API call
    });

    it('should refresh stale data', async () => {
      // Create stock with old lastUpdated
      // Fetch details
      // Assert API call made
    });
  });
});
```

**Deliverable:** Integration tests for all endpoints

#### 4.3 Manual Testing Checklist

```markdown
## Manual Testing Checklist

### API Client Tests
- [ ] Test getStockQuote with valid symbol (e.g., AAPL)
- [ ] Test getStockQuote with invalid symbol
- [ ] Test getStockOverview with valid symbol
- [ ] Test getHistoricalPrices with date range
- [ ] Test searchStocks with query
- [ ] Verify rate limiting works (console logs)
- [ ] Verify caching works (check cache stats)
- [ ] Test error handling (invalid API key)

### Endpoint Tests
- [ ] GET /api/stocks/search?q=APP - Should find AAPL
- [ ] GET /api/stocks/search?q=XYZ - Unknown symbol
- [ ] POST /api/stocks/update (with CRON_SECRET) - Update all
- [ ] GET /api/stocks/AAPL - Get stock details
- [ ] POST /api/stocks/AAPL - Force refresh

### Provider Switching Tests
- [ ] Set STOCK_DATA_PROVIDER=massive - Verify works
- [ ] Set STOCK_DATA_PROVIDER=alpha_vantage - Verify works
- [ ] Invalid provider - Should error gracefully

### Performance Tests
- [ ] Time stock update for 10 stocks
- [ ] Check API call count vs expected
- [ ] Verify cache hit rate > 60%
- [ ] Monitor memory usage

### Frontend Tests (if applicable)
- [ ] Dashboard displays updated prices
- [ ] Stock search shows results
- [ ] ETF creation uses current prices
- [ ] Charts display historical data
```

**Deliverable:** Completed manual testing checklist

---

### Phase 5: Deployment (Day 6)

#### 5.1 Pre-Deployment Checklist

```markdown
## Pre-Deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] No console.error or console.warn in production paths
- [ ] Environment variables documented
- [ ] Error handling covers all failure modes
- [ ] Rate limiting tested and verified

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Performance benchmarks acceptable

### Configuration
- [ ] MASSIVE_API_KEY added to production environment
- [ ] STOCK_DATA_PROVIDER set to "alpha_vantage" initially
- [ ] Rate limits configured correctly
- [ ] Cache sizes appropriate for production

### Monitoring
- [ ] Logging configured for production
- [ ] Error tracking enabled
- [ ] API usage metrics available
- [ ] Alerts configured for critical errors

### Rollback Plan
- [ ] Alpha Vantage still works
- [ ] Rollback procedure documented
- [ ] Team trained on rollback process
```

#### 5.2 Deployment Steps

**Step 1: Deploy with Alpha Vantage (Safety First)**
```bash
# Ensure current provider is alpha_vantage
export STOCK_DATA_PROVIDER=alpha_vantage

# Deploy to production
git checkout main
git pull origin main
git merge feature/migrate-to-massive
npm run build
# Deploy to your hosting platform
```

**Step 2: Verify Baseline**
- Test all endpoints work with Alpha Vantage
- Monitor for 1 hour
- Check logs for errors

**Step 3: Switch to Massive.com**
```bash
# Update environment variable
export STOCK_DATA_PROVIDER=massive

# Restart application
# (method depends on hosting platform)
```

**Step 4: Monitor Closely**
- Watch logs in real-time
- Check API usage dashboard on Massive.com
- Monitor error rates
- Verify stock prices updating correctly

**Step 5: Run Validation Tests**
- Manually trigger stock update cron job
- Search for stocks
- Create test ETF
- Verify all features work

**Step 6: Monitor for 4-6 Hours**
- Check every 30 minutes initially
- Monitor API costs
- Watch for rate limit issues
- Check cache performance

**Step 7: Decision Point**

**If Successful:**
- Continue monitoring for 24 hours
- Gradually reduce monitoring frequency
- Mark migration as complete

**If Issues:**
- Immediately rollback (set STOCK_DATA_PROVIDER=alpha_vantage)
- Document issues
- Fix in development
- Retry deployment

#### 5.3 Monitoring Dashboard

**Create:** `/src/app/api/admin/metrics/route.ts` (NEW)

**Purpose:** Real-time metrics for monitoring

```typescript
import { NextResponse } from 'next/server';
import { getCacheStats } from '@/lib/cache';
import { getStockProvider } from '@/lib/stockDataProvider';

export async function GET(request: Request) {
  // Only accessible to admins
  // Add authentication check here

  const provider = getStockProvider();

  // Get rate limiter stats (if Massive provider)
  let rateStats = null;
  if (provider instanceof MassiveProvider) {
    rateStats = provider.getRateLimiterStats();
  }

  // Get cache stats
  const cacheStats = getCacheStats();

  // Get database stats
  const stockCount = await prisma.stock.count();
  const recentUpdates = await prisma.stock.count({
    where: {
      lastUpdated: {
        gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
      }
    }
  });

  return NextResponse.json({
    provider: process.env.STOCK_DATA_PROVIDER,
    rateLimit: rateStats,
    cache: cacheStats,
    database: {
      totalStocks: stockCount,
      updatedLastHour: recentUpdates
    },
    timestamp: new Date().toISOString()
  });
}
```

**Access:** `GET /api/admin/metrics`

**Deliverable:** Live monitoring dashboard

---

### Phase 6: Post-Deployment (Day 7)

#### 6.1 Stabilization Period

**Day 7 Activities:**
- Monitor API usage and costs continuously
- Check error logs every 2 hours
- Verify cache hit rates
- Test user-facing features
- Collect performance metrics

**Key Metrics to Track:**
- API calls per hour/day
- Cache hit rate percentage
- Average response time
- Error rate
- Cost per 1000 requests

#### 6.2 Optimization

**Based on Monitoring Data:**

1. **If cache hit rate < 60%:**
   - Increase cache TTLs
   - Increase cache sizes
   - Pre-warm cache for popular stocks

2. **If rate limits being hit:**
   - Increase delays between requests
   - Implement smarter batching
   - Prioritize high-value stocks

3. **If costs too high:**
   - Increase cache TTLs
   - Reduce update frequency
   - Implement conditional updates (only if price changed significantly)

#### 6.3 Documentation

**Update Files:**
- `README.md` - API provider info
- `SETUP_INSTRUCTIONS.md` - Environment setup
- Create `MASSIVE_API_MIGRATION.md` - Complete migration record

**MASSIVE_API_MIGRATION.md Contents:**
```markdown
# Massive.com API Migration Record

## Overview
Migrated from Alpha Vantage to Massive.com on [DATE]

## Reasons for Migration
- Higher rate limits (500 vs 500/day)
- Better data quality
- More features

## Implementation Details
- Used abstraction layer pattern
- Implemented LRU caching
- Added comprehensive error handling

## Results
- API calls: [X] per day average
- Cache hit rate: [Y]%
- Average response time: [Z]ms
- Cost: $[A] per month
- Rollback capability: YES

## Lessons Learned
- [Add lessons learned]

## Known Issues
- [List any issues]

## Future Improvements
- [List potential improvements]
```

**Deliverable:** Complete documentation suite

---

## Files to Create/Modify

### New Files (9 files)

1. **`/src/lib/massiveApi.ts`**
   - Purpose: Massive.com API client
   - Lines: ~500-700
   - Key: Rate limiting, error handling, caching

2. **`/src/lib/stockDataProvider.ts`**
   - Purpose: Provider abstraction layer
   - Lines: ~100-150
   - Key: Interface and factory pattern

3. **`/src/lib/cache.ts`**
   - Purpose: LRU cache implementation
   - Lines: ~100-150
   - Key: Multiple cache instances with stats

4. **`/src/types/massive.ts`**
   - Purpose: Massive.com type definitions
   - Lines: ~100-200
   - Key: Request/response types

5. **`/src/app/api/stocks/[symbol]/route.ts`**
   - Purpose: Stock details endpoint
   - Lines: ~150-200
   - Key: On-demand fetching with cache

6. **`/src/app/api/admin/metrics/route.ts`**
   - Purpose: Monitoring endpoint
   - Lines: ~100-150
   - Key: Real-time stats

7. **`/src/lib/__tests__/massiveApi.test.ts`**
   - Purpose: Unit tests
   - Lines: ~300-500
   - Key: Comprehensive test coverage

8. **`/docs/MASSIVE_API_MIGRATION.md`**
   - Purpose: Migration documentation
   - Lines: ~100-200
   - Key: Complete migration record

9. **`.env.example` updates**
   - Purpose: Document new environment variables

### Modified Files (5 files)

1. **`/src/app/api/stocks/update/route.ts`**
   - Changes: Use provider abstraction
   - Lines modified: ~20-30

2. **`/src/app/api/stocks/search/route.ts`**
   - Changes: Add API fallback search
   - Lines modified: ~30-50

3. **`/src/types/index.ts`**
   - Changes: Export new types
   - Lines modified: ~5-10

4. **`.env` and `.env.local`**
   - Changes: Add Massive.com config
   - Lines added: ~8-10

5. **`README.md`**
   - Changes: Update API provider info
   - Lines modified: ~10-20

### Total Code Changes
- **New code:** ~1,500-2,000 lines
- **Modified code:** ~100-150 lines
- **Test code:** ~300-500 lines
- **Documentation:** ~200-400 lines

---

## Testing Strategy

### Test Pyramid

```
                    ┌───────────┐
                    │  Manual   │  5-10 test cases
                    │  Testing  │
                    └───────────┘
                   ┌─────────────┐
                   │ Integration │  20-30 test cases
                   │    Tests    │
                   └─────────────┘
                  ┌───────────────┐
                  │  Unit Tests   │  50-100 test cases
                  └───────────────┘
```

### Unit Tests (50-100 cases)

**Coverage Areas:**
- Massive.com API client methods
- Response transformation functions
- Rate limiter logic
- Cache operations
- Error handling
- Provider factory

**Tools:**
- Jest or Vitest
- Nock for HTTP mocking
- Test fixtures for API responses

### Integration Tests (20-30 cases)

**Coverage Areas:**
- API route handlers
- End-to-end data flow
- Provider switching
- Database interactions
- Cache integration

**Tools:**
- Supertest for API testing
- Test database
- Mock Massive.com responses

### Manual Tests (5-10 cases)

**Critical Paths:**
- Stock price updates
- Search functionality
- ETF creation/updates
- Historical data fetching
- Error scenarios

**Tools:**
- Postman/curl for API calls
- Browser for frontend testing
- Database queries for verification

---

## Deployment & Rollback

### Deployment Strategy

**Blue-Green Deployment:**
1. Deploy new code with STOCK_DATA_PROVIDER=alpha_vantage (green)
2. Test thoroughly
3. Switch to STOCK_DATA_PROVIDER=massive (blue)
4. Monitor closely
5. Keep green (alpha_vantage) ready for rollback

### Rollback Plan

#### Automatic Rollback Triggers

Roll back immediately if:
- Error rate > 10% for 15 minutes
- API costs spike unexpectedly
- Data accuracy issues detected
- Service downtime > 5 minutes
- Rate limit errors occurring

#### Rollback Procedure

**Step 1: Switch Provider (30 seconds)**
```bash
# Update environment variable
export STOCK_DATA_PROVIDER=alpha_vantage

# Restart application
pm2 restart stock-bundler  # or equivalent
```

**Step 2: Verify Alpha Vantage Works (5 minutes)**
```bash
# Test endpoints
curl https://your-domain.com/api/stocks/search?q=AAPL
curl -X POST https://your-domain.com/api/stocks/update \
  -H "X-Cron-Secret: $CRON_SECRET"
```

**Step 3: Monitor (30 minutes)**
- Check error logs
- Verify stock updates
- Test user features
- Confirm no errors

**Step 4: Incident Report**
- Document what went wrong
- Gather logs and metrics
- Plan fixes for retry

**Total Rollback Time:** < 1 hour

### Rollback Decision Matrix

| Issue | Severity | Action | Timeline |
|-------|----------|--------|----------|
| 500 errors | High | Immediate rollback | < 5 min |
| Rate limit exceeded | High | Immediate rollback | < 5 min |
| Invalid data | Critical | Immediate rollback | < 1 min |
| Slow performance | Medium | Monitor for 1hr, then rollback | 1 hour |
| High costs | Medium | Reduce usage, optimize | 24 hours |
| Cache issues | Low | Fix in code, not rollback | N/A |

---

## Monitoring & Success Criteria

### Key Performance Indicators (KPIs)

#### 1. Availability
- **Target:** 99.9% uptime
- **Measurement:** Error rate from monitoring
- **Alert:** > 0.1% errors for 5 minutes

#### 2. Performance
- **Target:** < 500ms average response time
- **Measurement:** API route response times
- **Alert:** > 1s response time for 10 minutes

#### 3. Cost
- **Target:** < $X/month (set based on budget)
- **Measurement:** Massive.com billing dashboard
- **Alert:** Projected monthly cost > budget

#### 4. Data Quality
- **Target:** 99.9% accuracy
- **Measurement:** Spot checks against reliable source
- **Alert:** Any pricing discrepancy > 1%

#### 5. Cache Efficiency
- **Target:** > 80% cache hit rate
- **Measurement:** Cache stats endpoint
- **Alert:** < 60% hit rate for 1 hour

### Monitoring Dashboards

#### Real-Time Dashboard (`/api/admin/metrics`)

**Displays:**
- Current provider
- API calls today
- Rate limit usage (X/500)
- Cache hit rates
- Recent errors
- Last update time

**Refresh:** Every 30 seconds

#### Daily Report (Email/Slack)

**Contents:**
- Total API calls
- Average response time
- Error summary
- Cost estimate
- Cache performance
- Top stocks by requests

**Frequency:** Daily at 9 AM

### Success Criteria Checklist

**Week 1 (Migration Week):**
- [ ] Zero critical errors
- [ ] < 1% minor errors
- [ ] All features working
- [ ] Cache hit rate > 70%
- [ ] API costs within budget
- [ ] User complaints = 0

**Week 2 (Stabilization):**
- [ ] Cache hit rate > 80%
- [ ] Response times optimized
- [ ] No rate limit issues
- [ ] Cost tracking accurate
- [ ] Documentation complete
- [ ] Team trained on new system

**Month 1 (Long-term):**
- [ ] 99.9%+ uptime
- [ ] Optimized cache TTLs
- [ ] Cost-per-request minimized
- [ ] Monitoring automated
- [ ] Runbooks complete
- [ ] Consider removing Alpha Vantage

---

## Risk Assessment

### High-Risk Items

#### 1. Rate Limit Differences
**Risk:** Massive.com rate limits may be different than expected

**Impact:** HIGH - Could break stock updates

**Mitigation:**
- Research thoroughly before implementation
- Test with real API key early
- Implement conservative rate limiter
- Monitor usage closely
- Keep Alpha Vantage as fallback

**Probability:** MEDIUM

---

#### 2. Data Format Changes
**Risk:** Response format differences break transformation

**Impact:** HIGH - Incorrect stock prices

**Mitigation:**
- Comprehensive unit tests for transformations
- Validation against known values
- Type safety with TypeScript
- Extensive testing before production

**Probability:** MEDIUM

---

#### 3. Cost Overruns
**Risk:** API usage higher than expected, costs spike

**Impact:** MEDIUM - Budget issues

**Mitigation:**
- Aggressive caching strategy
- Monitor costs daily
- Set budget alerts
- Implement request quotas
- Optimize before scaling

**Probability:** LOW

---

### Medium-Risk Items

#### 4. Cache Invalidation Issues
**Risk:** Stale data served from cache

**Impact:** MEDIUM - Users see old prices

**Mitigation:**
- Conservative TTLs initially (5 min for quotes)
- Manual refresh endpoint
- Cache stats monitoring
- Clear cache on errors

**Probability:** LOW

---

#### 5. Migration Downtime
**Risk:** Bugs during deployment cause downtime

**Impact:** MEDIUM - Service unavailable

**Mitigation:**
- Blue-green deployment
- Deploy during off-peak hours
- Keep Alpha Vantage active
- Comprehensive testing
- Fast rollback procedure

**Probability:** LOW

---

### Low-Risk Items

#### 6. Team Onboarding
**Risk:** Team unfamiliar with new API

**Impact:** LOW - Slower development

**Mitigation:**
- Comprehensive documentation
- Code comments
- Training session
- Runbooks for common tasks

**Probability:** MEDIUM

---

#### 7. Future API Changes
**Risk:** Massive.com changes API without notice

**Impact:** LOW - Temporary breakage

**Mitigation:**
- Subscribe to API changelog
- Abstraction layer allows quick switching
- Version API requests
- Monitor for breaking changes

**Probability:** LOW

---

## Timeline & Milestones

### Week 1: Migration Week (Critical Timeline)

#### Day 1 (Monday) - Setup & Research
**Time:** 4-6 hours

**Morning (2-3 hours):**
- [ ] 9:00 AM - Install MCP for web access
- [ ] 9:30 AM - Fetch Massive.com documentation
- [ ] 10:00 AM - Read API docs thoroughly
- [ ] 11:00 AM - Document endpoints and rate limits

**Afternoon (2-3 hours):**
- [ ] 1:00 PM - Get Massive.com API key
- [ ] 1:30 PM - Test sample API calls with curl
- [ ] 2:00 PM - Create feature branch
- [ ] 2:30 PM - Set up development environment
- [ ] 3:00 PM - Document findings

**Deliverables:**
- API endpoint mapping
- Rate limit documentation
- Test API calls verified
- Development environment ready

---

#### Day 2 (Tuesday) - Core Implementation Part 1
**Time:** 6-8 hours

**Morning (3-4 hours):**
- [ ] 9:00 AM - Create type definitions (`massive.ts`)
- [ ] 10:00 AM - Implement abstraction layer (`stockDataProvider.ts`)
- [ ] 11:00 AM - Start Massive.com client (`massiveApi.ts`)
- [ ] 12:00 PM - Implement rate limiter class

**Afternoon (3-4 hours):**
- [ ] 1:00 PM - Implement error handling
- [ ] 2:00 PM - Implement HTTP client with retry
- [ ] 3:00 PM - Implement getStockQuote method
- [ ] 4:00 PM - Test getStockQuote with real API

**Deliverables:**
- Type definitions complete
- Abstraction layer working
- Basic Massive.com client functional
- getStockQuote tested successfully

---

#### Day 3 (Wednesday) - Core Implementation Part 2
**Time:** 6-8 hours

**Morning (3-4 hours):**
- [ ] 9:00 AM - Implement getStockOverview method
- [ ] 10:00 AM - Implement getHistoricalPrices method
- [ ] 11:00 AM - Implement searchStocks method
- [ ] 12:00 PM - Implement caching layer (`cache.ts`)

**Afternoon (3-4 hours):**
- [ ] 1:00 PM - Integrate cache with API client
- [ ] 2:00 PM - Add monitoring and stats
- [ ] 3:00 PM - Update environment configuration
- [ ] 4:00 PM - Comprehensive testing of all methods

**Deliverables:**
- All API methods implemented
- Caching layer working
- Environment configured
- All methods tested

---

#### Day 4 (Thursday) - Integration
**Time:** 6-8 hours

**Morning (3-4 hours):**
- [ ] 9:00 AM - Update stock update cron job
- [ ] 10:00 AM - Test cron job with Massive.com
- [ ] 11:00 AM - Enhance stock search route
- [ ] 12:00 PM - Test search with API fallback

**Afternoon (3-4 hours):**
- [ ] 1:00 PM - Create stock details endpoint
- [ ] 2:00 PM - Create metrics endpoint
- [ ] 3:00 PM - Integration testing
- [ ] 4:00 PM - Fix any integration issues

**Deliverables:**
- All endpoints updated
- Integration complete
- Integration tests passing

---

#### Day 5 (Friday) - Testing
**Time:** 4-6 hours

**Morning (2-3 hours):**
- [ ] 9:00 AM - Write unit tests
- [ ] 10:00 AM - Run test suite
- [ ] 11:00 AM - Fix failing tests
- [ ] 12:00 PM - Manual testing checklist

**Afternoon (2-3 hours):**
- [ ] 1:00 PM - Test with real API key
- [ ] 2:00 PM - Monitor API usage
- [ ] 3:00 PM - Test error scenarios
- [ ] 4:00 PM - Performance testing

**Deliverables:**
- Unit tests complete and passing
- Integration tests passing
- Manual testing checklist complete
- Performance benchmarks documented

---

#### Day 6 (Saturday) - Deployment
**Time:** 4-6 hours

**Morning (2-3 hours):**
- [ ] 10:00 AM - Pre-deployment checklist
- [ ] 10:30 AM - Deploy with alpha_vantage provider
- [ ] 11:00 AM - Verify baseline works
- [ ] 12:00 PM - Switch to massive provider

**Afternoon (2-3 hours):**
- [ ] 1:00 PM - Monitor closely (every 15 min)
- [ ] 2:00 PM - Run validation tests
- [ ] 3:00 PM - Check metrics dashboard
- [ ] 4:00 PM - Continue monitoring

**Evening:**
- [ ] 6:00 PM - Status check
- [ ] 9:00 PM - Final check before sleep

**Deliverables:**
- Deployed to production
- Massive.com provider active
- No critical errors
- Monitoring in place

---

#### Day 7 (Sunday) - Stabilization
**Time:** 2-4 hours

**Morning:**
- [ ] 10:00 AM - Check overnight logs
- [ ] 10:30 AM - Review metrics
- [ ] 11:00 AM - Optimize cache TTLs if needed
- [ ] 12:00 PM - Test all features

**Afternoon:**
- [ ] 2:00 PM - Update documentation
- [ ] 3:00 PM - Create migration record
- [ ] 4:00 PM - Plan for Week 2

**Deliverables:**
- System stable
- Documentation complete
- Migration record created
- Optimization plan for Week 2

---

### Week 2: Optimization & Cleanup

**Goals:**
- Optimize cache performance
- Fine-tune rate limiting
- Reduce API costs
- Complete all documentation
- Train team on new system

**Optional:**
- Remove Alpha Vantage code (if migration successful)
- Add advanced features (WebSocket support, etc.)

---

## API Endpoint Mapping (To Be Completed)

**Note:** This section will be filled in after accessing Massive.com documentation

| Feature | Alpha Vantage | Massive.com | Notes |
|---------|---------------|-------------|-------|
| Real-time Quote | `GLOBAL_QUOTE` | `???` | To be determined |
| Company Info | `OVERVIEW` | `???` | To be determined |
| Historical Daily | `TIME_SERIES_DAILY` | `???` | To be determined |
| Search Symbols | N/A | `???` | To be determined |
| Batch Quotes | N/A | `???` | Check if available |

**Action Required:** Research Massive.com docs and fill in this table on Day 1

---

## Environment Variables Reference

### Current (Alpha Vantage)
```env
ALPHA_VANTAGE_API_KEY="your-key"
```

### New (Massive.com)
```env
# Massive.com API
MASSIVE_API_KEY="your-massive-api-key"
MASSIVE_BASE_URL="https://api.massive.com"  # Verify from docs
MASSIVE_RATE_LIMIT_PER_MINUTE=5  # Update from docs
MASSIVE_RATE_LIMIT_PER_DAY=500   # Update from docs

# Provider Selection
STOCK_DATA_PROVIDER="massive"  # Options: "massive" | "alpha_vantage"

# Keep for rollback
ALPHA_VANTAGE_API_KEY="your-key"
```

### Production .env.example
```env
# Database
DATABASE_URL="postgresql://user@localhost:5432/stock_bundler?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"

# Stock Data Provider
STOCK_DATA_PROVIDER="massive"  # Options: "massive" | "alpha_vantage"

# Massive.com API (Primary)
MASSIVE_API_KEY="your-massive-api-key-here"
MASSIVE_BASE_URL="https://api.massive.com"
MASSIVE_RATE_LIMIT_PER_MINUTE=5
MASSIVE_RATE_LIMIT_PER_DAY=500

# Alpha Vantage API (Backup)
ALPHA_VANTAGE_API_KEY="your-alpha-vantage-api-key"

# Cron Job
CRON_SECRET="your-cron-secret"

# Development
NODE_ENV="development"
```

---

## Cost Analysis

### Alpha Vantage (Current)
- **Plan:** Free Tier
- **Cost:** $0/month
- **Limits:** 5 req/min, 500 req/day
- **Features:** Basic quotes, overview, daily history

### Massive.com Stock Starter (New)
- **Plan:** Stock Starter
- **Cost:** $TBD/month (check pricing page)
- **Limits:** TBD req/min, TBD req/day
- **Features:** TBD (research from docs)

### Estimated Usage
- **Stocks in database:** ~50-100
- **Update frequency:** Every 15 minutes during market hours
- **Market hours:** 6.5 hours/day, 5 days/week
- **Updates per week:** 50 stocks × 26 updates = 1,300 requests/week
- **User searches:** ~100/week estimate
- **Total:** ~1,500 requests/week (~6,000/month)

### Cost Optimization Strategies
1. **Aggressive caching** - Reduce API calls by 80%
2. **Smart updates** - Only update changed prices
3. **Off-peak updates** - Update less frequently after hours
4. **User-triggered updates** - Update on-demand instead of scheduled

---

## Lessons Learned (To Be Updated Post-Migration)

**This section will be filled in after migration completes**

### What Went Well
- [Add after migration]

### What Could Be Improved
- [Add after migration]

### Unexpected Challenges
- [Add after migration]

### Best Practices Discovered
- [Add after migration]

---

## Appendix

### A. Useful Commands

**Start Development Server:**
```bash
npm run dev
```

**Run Database Migrations:**
```bash
npm run db:migrate
```

**Run Tests:**
```bash
npm test
npm run test:watch
```

**Build for Production:**
```bash
npm run build
npm start
```

**Trigger Stock Update:**
```bash
curl -X POST http://localhost:3000/api/stocks/update \
  -H "X-Cron-Secret: $CRON_SECRET"
```

**Check Metrics:**
```bash
curl http://localhost:3000/api/admin/metrics
```

**Search Stocks:**
```bash
curl "http://localhost:3000/api/stocks/search?q=AAPL"
```

### B. Contact Information

**Massive.com Support:**
- Documentation: https://massive.com/docs
- Support: [Contact from website]

**Team Contacts:**
- Project Lead: [Your name]
- Backend Developer: [Name]
- DevOps: [Name]

### C. Related Documentation

- `DATABASE_SETUP.md` - Database configuration
- `PERFORMANCE_OPTIMIZATION_SUMMARY.md` - Performance improvements
- `POSTGRES_INSTALLATION_ALTERNATIVES.md` - Database setup
- `README.md` - Project overview

---

## Next Steps

**Immediate Actions (Day 1):**

1. ✅ Review this plan completely
2. ⏳ Install MCP for web access
3. ⏳ Research Massive.com API documentation
4. ⏳ Get Massive.com API key
5. ⏳ Create feature branch: `feature/migrate-to-massive`
6. ⏳ Begin implementation

**Questions to Resolve:**
1. What are exact Massive.com rate limits for Stock Starter plan?
2. What are the specific API endpoints we'll use?
3. Is batch quote fetching available?
4. What's the data delay (real-time vs delayed)?
5. Are there any additional costs for specific features?

---

**Document Version:** 1.0
**Last Updated:** 2025-11-08
**Status:** ACTIVE MIGRATION IN PROGRESS
**Owner:** Stock Bundler Development Team
