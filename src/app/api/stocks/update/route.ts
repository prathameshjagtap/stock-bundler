import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStockQuote, getStockOverview } from '@/lib/stockApi';
import { cronRateLimit, getClientIdentifier, addRateLimitHeaders, rateLimitExceededResponse } from '@/lib/rate-limit';

/**
 * API route to update stock prices
 * This will be called by a cron job every 15 minutes
 */
export async function POST(request: Request) {
  try {
    // ✅ CHECK RATE LIMIT (3 requests per minute - very strict for cron)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await cronRateLimit.limit(identifier);

    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(
        rateLimitResult,
        'Cron job rate limit exceeded. Too many update requests.'
      );
    }

    // ✅ VERIFY CRON SECRET to prevent unauthorized access
    const authHeader = request.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all stocks from database
    const stocks = await prisma.stock.findMany({
      select: {
        id: true,
        symbol: true,
      },
    });

    console.log(`Updating prices for ${stocks.length} stocks...`);

    let updated = 0;
    let failed = 0;

    for (const stock of stocks) {
      try {
        // Fetch latest quote
        const quote = await getStockQuote(stock.symbol);

        if (quote) {
          // Update stock price
          await prisma.stock.update({
            where: { id: stock.id },
            data: {
              currentPrice: quote.price,
              lastUpdated: new Date(),
            },
          });

          // Record price history
          await prisma.priceHistory.create({
            data: {
              stockId: stock.id,
              price: quote.price,
              volume: BigInt(quote.volume),
              timestamp: quote.timestamp,
            },
          });

          updated++;
          console.log(`✓ Updated ${stock.symbol}: $${quote.price}`);
        } else {
          failed++;
          console.log(`✗ Failed to update ${stock.symbol}`);
        }
      } catch (error) {
        failed++;
        console.error(`Error updating ${stock.symbol}:`, error);
      }
    }

    console.log(`Stock update completed: ${updated} updated, ${failed} failed`);

    const response = NextResponse.json({
      success: true,
      updated,
      failed,
      total: stocks.length,
    });
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('Error in stock update:', error);
    return NextResponse.json(
      { error: 'Failed to update stocks' },
      { status: 500 }
    );
  }
}
