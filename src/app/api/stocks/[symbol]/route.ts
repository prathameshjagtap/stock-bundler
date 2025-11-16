import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStockProviderSingleton } from '@/lib/stockDataProvider';
import { clearStockCache } from '@/lib/cache';

/**
 * GET /api/stocks/[symbol]
 * Fetch detailed stock information
 *
 * Behavior:
 * - Returns cached data if fresh (< 1 hour old)
 * - Fetches from API if stale or missing
 * - Automatically updates database
 */
export async function GET(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase();

    // 1. Check database first
    const existingStock = await prisma.stock.findUnique({
      where: { symbol },
      include: {
        priceHistory: {
          take: 30, // Last 30 price points
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    // 2. If stock exists and data is fresh (< 1 hour), return it
    if (existingStock && existingStock.lastUpdated) {
      const age = Date.now() - existingStock.lastUpdated.getTime();
      const oneHourMs = 60 * 60 * 1000;

      if (age < oneHourMs) {
        return NextResponse.json({
          stock: existingStock,
          source: 'database',
          age: Math.floor(age / 1000), // age in seconds
        });
      }
    }

    // 3. Fetch fresh data from API
    const provider = getStockProviderSingleton();
    console.log(`[StockDetails] Fetching fresh data for ${symbol} from ${provider.getName()}`);

    const [quote, overview] = await Promise.all([
      provider.getStockQuote(symbol),
      provider.getStockOverview(symbol),
    ]);

    if (!quote && !overview) {
      return NextResponse.json(
        { error: 'Stock not found' },
        { status: 404 }
      );
    }

    // 4. Update or create stock in database
    const updatedStock = await prisma.stock.upsert({
      where: { symbol },
      update: {
        name: overview?.name || existingStock?.name || symbol,
        sector: overview?.sector || existingStock?.sector,
        industry: overview?.industry || existingStock?.industry,
        marketCap: overview?.marketCap || existingStock?.marketCap,
        currentPrice: quote?.price || existingStock?.currentPrice || 0,
        lastUpdated: new Date(),
      },
      create: {
        symbol,
        name: overview?.name || symbol,
        sector: overview?.sector,
        industry: overview?.industry,
        marketCap: overview?.marketCap,
        currentPrice: quote?.price || 0,
        lastUpdated: new Date(),
      },
      include: {
        priceHistory: {
          take: 30,
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    // 5. Add to price history if we have a quote
    if (quote) {
      await prisma.priceHistory.create({
        data: {
          stockId: updatedStock.id,
          price: quote.price,
          volume: BigInt(quote.volume),
          timestamp: quote.timestamp,
        },
      });
    }

    return NextResponse.json({
      stock: updatedStock,
      source: 'api',
      provider: provider.getName(),
      overview, // Include full overview data
    });

  } catch (error) {
    console.error(`Error fetching stock details:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch stock details' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stocks/[symbol]
 * Force refresh stock data (clear cache and fetch fresh)
 */
export async function POST(
  request: Request,
  { params }: { params: { symbol: string } }
) {
  try {
    const symbol = params.symbol.toUpperCase();

    // Clear cache for this stock
    clearStockCache(symbol);

    console.log(`[StockDetails] Force refresh for ${symbol}`);

    // Redirect to GET to fetch fresh data
    return GET(request, { params: { symbol } });

  } catch (error) {
    console.error(`Error force refreshing stock:`, error);
    return NextResponse.json(
      { error: 'Failed to refresh stock' },
      { status: 500 }
    );
  }
}
