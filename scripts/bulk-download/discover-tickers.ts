#!/usr/bin/env ts-node
/**
 * Ticker Discovery Script
 *
 * Fetches all active US stocks and top 1000 ETFs from Massive.com API
 * and stores them in the database for bulk historical data download.
 *
 * Usage:
 *   npx ts-node scripts/bulk-download/discover-tickers.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY;
const MASSIVE_BASE_URL = process.env.MASSIVE_BASE_URL || 'https://api.massive.com';

interface TickerResult {
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
  market_cap?: number;
  sic_description?: string;
}

async function discoverAndStoreAllTickers() {
  console.log('='.repeat(80));
  console.log('TICKER DISCOVERY - Massive.com API');
  console.log('='.repeat(80));
  console.log('Fetching all active US stocks and top 1000 ETFs...\n');

  if (!MASSIVE_API_KEY) {
    console.error('❌ Error: MASSIVE_API_KEY not set in environment variables');
    console.error('Please add it to your .env file');
    process.exit(1);
  }

  let allTickers: TickerResult[] = [];

  // Fetch all stocks
  console.log('[1/3] Fetching all active US stocks...');
  const stocks = await fetchAllStocks();
  console.log(`✅ Found ${stocks.length} stocks\n`);
  allTickers.push(...stocks);

  // Fetch top 1000 ETFs
  console.log('[2/3] Fetching top 1000 ETFs by market cap...');
  const etfs = await fetchTopETFs(1000);
  console.log(`✅ Found ${etfs.length} ETFs\n`);
  allTickers.push(...etfs);

  // Remove duplicates (just in case)
  const uniqueTickers = Array.from(
    new Map(allTickers.map(t => [t.ticker, t])).values()
  );

  console.log(`[3/3] Storing ${uniqueTickers.length} securities in database...\n`);

  // Batch create in database
  let created = 0;
  let updated = 0;
  const batchSize = 100;

  for (let i = 0; i < uniqueTickers.length; i += batchSize) {
    const batch = uniqueTickers.slice(i, i + batchSize);

    // Try to create, but skip duplicates
    const result = await prisma.stock.createMany({
      data: batch.map(ticker => ({
        symbol: ticker.ticker,
        name: ticker.name,
        sector: ticker.sic_description || null,
        marketCap: ticker.market_cap || null,
        currentPrice: 0, // Placeholder - will be filled by bulk download
      })),
      skipDuplicates: true,
    });

    created += result.count;

    // Update existing stocks with latest info
    for (const ticker of batch) {
      try {
        await prisma.stock.updateMany({
          where: { symbol: ticker.ticker },
          data: {
            name: ticker.name,
            sector: ticker.sic_description || undefined,
            marketCap: ticker.market_cap || undefined,
          },
        });
      } catch {
        // Ignore update errors
      }
    }

    const progress = Math.min(i + batchSize, uniqueTickers.length);
    const percentage = ((progress / uniqueTickers.length) * 100).toFixed(1);
    console.log(`  Progress: ${progress}/${uniqueTickers.length} (${percentage}%)`);
  }

  const totalInDb = await prisma.stock.count();

  console.log('\n' + '='.repeat(80));
  console.log('DISCOVERY COMPLETE');
  console.log('='.repeat(80));
  console.log(`New securities created: ${created}`);
  console.log(`Total securities in database: ${totalInDb}`);
  console.log(`Stocks: ~${stocks.length}`);
  console.log(`ETFs: ~${etfs.length}`);
  console.log('='.repeat(80));
  console.log('\n✅ Ready for bulk download!');
  console.log('Run: npx ts-node scripts/bulk-download/download-historical.ts\n');

  await prisma.$disconnect();
}

/**
 * Fetch all active US stocks with pagination
 */
async function fetchAllStocks(): Promise<TickerResult[]> {
  const allStocks: TickerResult[] = [];
  let page = 1;
  let cursor: string | undefined;
  let hasMore = true;

  while (hasMore) {
    const url = `${MASSIVE_BASE_URL}/v3/reference/tickers?active=true&market=stocks&limit=1000${
      cursor ? `&cursor=${cursor}` : ''
    }`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${MASSIVE_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        allStocks.push(...data.results);
        console.log(
          `  Page ${page}: ${data.results.length} stocks | Total: ${allStocks.length}`
        );
      }

      // Check for next page
      if (data.next_url) {
        const nextUrl = new URL(data.next_url);
        cursor = nextUrl.searchParams.get('cursor') || undefined;
        hasMore = !!cursor;
      } else {
        hasMore = false;
      }

      page++;

      // Add small delay to avoid rate limiting
      await sleep(100);
    } catch (error) {
      console.error(`Error fetching stocks page ${page}:`, error);
      throw error;
    }
  }

  return allStocks;
}

/**
 * Fetch top N ETFs by market cap
 */
async function fetchTopETFs(limit: number): Promise<TickerResult[]> {
  const allETFs: TickerResult[] = [];
  let fetched = 0;
  let cursor: string | undefined;

  while (fetched < limit) {
    const remaining = limit - fetched;
    const batchSize = Math.min(1000, remaining);

    const url = `${MASSIVE_BASE_URL}/v3/reference/tickers?active=true&type=ETF&limit=${batchSize}&sort=market_cap&order=desc${
      cursor ? `&cursor=${cursor}` : ''
    }`;

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${MASSIVE_API_KEY}`,
        },
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        allETFs.push(...data.results);
        fetched += data.results.length;
        console.log(`  Fetched: ${fetched}/${limit} ETFs`);
      }

      // Check if we have more
      if (data.next_url && fetched < limit) {
        const nextUrl = new URL(data.next_url);
        cursor = nextUrl.searchParams.get('cursor') || undefined;
      } else {
        break;
      }

      // Add small delay
      await sleep(100);
    } catch (error) {
      console.error('Error fetching ETFs:', error);
      throw error;
    }
  }

  return allETFs;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run main function
discoverAndStoreAllTickers().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
