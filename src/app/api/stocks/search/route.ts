import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { StockSearchSchema, formatValidationError } from '@/lib/validation/schemas';
import { z } from 'zod';
import { searchRateLimit, getClientIdentifier, addRateLimitHeaders, rateLimitExceededResponse } from '@/lib/rate-limit';

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

    const stocks = await prisma.stock.findMany({
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

    const response = NextResponse.json(stocks);
    return addRateLimitHeaders(response, rateLimitResult);
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
