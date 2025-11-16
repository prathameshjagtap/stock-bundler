import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { StockSearchSchema, formatValidationError } from '@/lib/validation/schemas';
import { z } from 'zod';
import { searchRateLimit, getClientIdentifier, addRateLimitHeaders, rateLimitExceededResponse } from '@/lib/rate-limit';
import { getStockProviderSingleton } from '@/lib/stockDataProvider';

export async function GET(request: Request) {
  try {
    // ✅ CHECK RATE LIMIT (20 requests per minute)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await searchRateLimit.limit(identifier);

    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(
        rateLimitResult,
        'Too many search requests. Please wait before searching again.'
      );
    }

    const { searchParams } = new URL(request.url);

    // ✅ VALIDATE SEARCH PARAMS WITH ZOD SCHEMA
    const validationResult = StockSearchSchema.safeParse({
      q: searchParams.get('q')
    });

    if (!validationResult.success) {
      return NextResponse.json(
        formatValidationError(validationResult.error),
        { status: 400 }
      );
    }

    const { q: query } = validationResult.data;

    // 1. Search local database first (fast, no API cost)
    const localStocks = await prisma.stock.findMany({
      where: {
        OR: [
          { symbol: { contains: query.toUpperCase(), mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: 10,
      orderBy: {
        symbol: 'asc',
      },
    });

    // 2. If we have enough results (>= 5), return them
    if (localStocks.length >= 5) {
      const response = NextResponse.json({
        stocks: localStocks,
        source: 'database',
        count: localStocks.length
      });
      return addRateLimitHeaders(response, rateLimitResult);
    }

    // 3. If insufficient local results, search API for additional stocks
    try {
      const provider = getStockProviderSingleton();
      console.log(`[StockSearch] Searching API with ${provider.getName()} for: ${query}`);

      const apiResults = await provider.searchStocks(query);

      // 4. Add new stocks to database (basic info only)
      const newStocks = [];
      for (const result of apiResults) {
        // Check if stock already exists in local results
        const exists = localStocks.find(s => s.symbol === result.symbol);
        if (!exists) {
          // Check if stock exists in database
          const existingStock = await prisma.stock.findUnique({
            where: { symbol: result.symbol }
          });

          if (!existingStock) {
            // Create new stock entry with placeholder price
            const created = await prisma.stock.create({
              data: {
                symbol: result.symbol,
                name: result.name,
                currentPrice: 0, // Will be updated by cron job or on-demand
              },
            });
            newStocks.push(created);
          } else {
            newStocks.push(existingStock);
          }
        }
      }

      // 5. Combine local and new results
      const combinedStocks = [...localStocks, ...newStocks].slice(0, 10);

      const response = NextResponse.json({
        stocks: combinedStocks,
        source: 'combined',
        count: combinedStocks.length,
        newStocksAdded: newStocks.length
      });
      return addRateLimitHeaders(response, rateLimitResult);

    } catch (apiError) {
      // API search failed - gracefully fall back to local results only
      console.error('[StockSearch] API search failed, using database results only:', apiError);
      const response = NextResponse.json({
        stocks: localStocks,
        source: 'database',
        count: localStocks.length,
        warning: 'API search unavailable'
      });
      return addRateLimitHeaders(response, rateLimitResult);
    }
  } catch (error) {
    // ✅ HANDLE VALIDATION ERRORS
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        formatValidationError(error),
        { status: 400 }
      );
    }

    console.error('Error searching stocks:', error);
    return NextResponse.json(
      { error: 'Failed to search stocks' },
      { status: 500 }
    );
  }
}
