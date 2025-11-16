import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateWeights } from '@/lib/etfCalculations';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { CreateETFSchema, formatValidationError } from '@/lib/validation/schemas';
import { z } from 'zod';
import { apiRateLimit, getClientIdentifier, addRateLimitHeaders, rateLimitExceededResponse } from '@/lib/rate-limit';

/**
 * GET /api/etfs - List all ETFs
 */
export async function GET(request: Request) {
  try {
    // ✅ CHECK RATE LIMIT (10 requests per 10 seconds)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await apiRateLimit.limit(identifier);

    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(
        rateLimitResult,
        'Too many requests. Please slow down.'
      );
    }
    const { searchParams } = new URL(request.url);
    const isCustom = searchParams.get('custom');

    // Get session to filter user's custom ETFs
    const session = await getServerSession(authOptions);

    let whereClause: any = {};

    // If requesting custom ETFs
    if (isCustom === 'true') {
      whereClause.isCustom = true;

      // If authenticated, only show user's custom ETFs
      if (session?.user) {
        whereClause.createdBy = session.user.id;
      } else {
        // If not authenticated and requesting custom ETFs, return empty array
        return NextResponse.json([]);
      }
    } else if (isCustom === 'false') {
      // Only predefined ETFs
      whereClause.isCustom = false;
    }
    // If isCustom is null, show all (both predefined and user's custom if authenticated)

    const etfs = await prisma.eTF.findMany({
      where: whereClause,
      include: {
        compositions: {
          include: {
            stock: true,
          },
        },
      },
      orderBy: {
        ticker: 'asc',
      },
    });

    const response = NextResponse.json(etfs);
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('Error fetching ETFs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ETFs' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/etfs - Create a new custom ETF
 */
export async function POST(request: Request) {
  try {
    // ✅ CHECK RATE LIMIT (10 requests per 10 seconds)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await apiRateLimit.limit(identifier);

    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(
        rateLimitResult,
        'Too many ETF creation requests. Please slow down.'
      );
    }

    // AUTHENTICATION - Require user to be logged in
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in to create an ETF' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // ✅ VALIDATE INPUT WITH ZOD SCHEMA
    const validatedData = CreateETFSchema.parse(body);
    const { ticker, name, description, weightingMethod, stocks } = validatedData;

    // USE SESSION USER ID, NOT REQUEST BODY
    const userId = session.user.id;

    // Check if ticker already exists
    const existing = await prisma.eTF.findUnique({
      where: { ticker },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'ETF with this ticker already exists' },
        { status: 409 }
      );
    }

    // Create ETF
    const etf = await prisma.eTF.create({
      data: {
        ticker,
        name,
        description,
        weightingMethod,
        isCustom: true,
        createdBy: userId,
      },
    });

    // Fetch stock data for weight calculation
    const stockSymbols = stocks.map((s: any) => s.symbol);
    const stockData = await prisma.stock.findMany({
      where: {
        symbol: { in: stockSymbols },
      },
    });

    // Calculate weights based on method
    const stocksWithPrices = stockData.map(stock => ({
      symbol: stock.symbol,
      price: stock.currentPrice,
      marketCap: stock.marketCap || undefined,
    }));

    const weightedStocks = calculateWeights(stocksWithPrices, weightingMethod);

    // ✅ PERFORMANCE: Use createMany to avoid N+1 queries (batch insert)
    const compositionsData = weightedStocks
      .map(stock => {
        const dbStock = stockData.find(s => s.symbol === stock.symbol);
        if (!dbStock) return null;

        return {
          etfId: etf.id,
          stockId: dbStock.id,
          weight: stock.weight,
        };
      })
      .filter((comp): comp is NonNullable<typeof comp> => comp !== null);

    await prisma.eTFComposition.createMany({
      data: compositionsData,
    });

    // Fetch complete ETF with compositions
    const completeETF = await prisma.eTF.findUnique({
      where: { id: etf.id },
      include: {
        compositions: {
          include: {
            stock: true,
          },
        },
      },
    });

    const response = NextResponse.json(completeETF, { status: 201 });
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    // ✅ HANDLE VALIDATION ERRORS
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        formatValidationError(error),
        { status: 400 }
      );
    }

    console.error('Error creating ETF:', error);
    return NextResponse.json(
      { error: 'Failed to create ETF' },
      { status: 500 }
    );
  }
}
