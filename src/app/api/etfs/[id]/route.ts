import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateWeights } from '@/lib/etfCalculations';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { UpdateETFSchema, formatValidationError } from '@/lib/validation/schemas';
import { z } from 'zod';
import { apiRateLimit, getClientIdentifier, addRateLimitHeaders, rateLimitExceededResponse } from '@/lib/rate-limit';

/**
 * GET /api/etfs/[id] - Get ETF details
 * Public endpoint - anyone can view ETF details
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ CHECK RATE LIMIT (10 requests per 10 seconds)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await apiRateLimit.limit(identifier);

    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(rateLimitResult);
    }
    const etf = await prisma.eTF.findUnique({
      where: { id: params.id },
      include: {
        compositions: {
          include: {
            stock: true,
          },
        },
      },
    });

    if (!etf) {
      return NextResponse.json({ error: 'ETF not found' }, { status: 404 });
    }

    const response = NextResponse.json(etf);
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('Error fetching ETF:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ETF' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/etfs/[id] - Update ETF composition
 * Requires authentication and ownership
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ CHECK RATE LIMIT (10 requests per 10 seconds)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await apiRateLimit.limit(identifier);

    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(
        rateLimitResult,
        'Too many update requests. Please slow down.'
      );
    }

    // AUTHENTICATION - Require user to be logged in
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // ✅ VALIDATE INPUT WITH ZOD SCHEMA
    const validatedData = UpdateETFSchema.parse(body);
    const { addStocks, removeStocks } = validatedData;

    // Fetch ETF to check authorization
    const etf = await prisma.eTF.findUnique({
      where: { id: params.id },
      include: {
        compositions: {
          include: {
            stock: true,
          },
        },
      },
    });

    if (!etf) {
      return NextResponse.json({ error: 'ETF not found' }, { status: 404 });
    }

    // AUTHORIZATION - Check if user owns this ETF
    if (etf.isCustom && etf.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this ETF' },
        { status: 403 }
      );
    }

    // PREVENT MODIFICATION OF PREDEFINED ETFs
    if (!etf.isCustom) {
      return NextResponse.json(
        { error: 'Cannot modify predefined ETFs' },
        { status: 403 }
      );
    }

    // Remove stocks
    if (removeStocks && removeStocks.length > 0) {
      const stocksToRemove = await prisma.stock.findMany({
        where: {
          symbol: { in: removeStocks },
        },
      });

      await prisma.eTFComposition.deleteMany({
        where: {
          etfId: params.id,
          stockId: { in: stocksToRemove.map(s => s.id) },
        },
      });
    }

    // Add stocks
    if (addStocks && addStocks.length > 0) {
      const stocksToAdd = await prisma.stock.findMany({
        where: {
          symbol: { in: addStocks },
        },
      });

      // Get current compositions
      const currentCompositions = await prisma.eTFComposition.findMany({
        where: { etfId: params.id },
        include: { stock: true },
      });

      // Combine existing and new stocks for rebalancing
      const allStocks = [
        ...currentCompositions.map(c => ({
          symbol: c.stock.symbol,
          price: c.stock.currentPrice,
          marketCap: c.stock.marketCap || undefined,
        })),
        ...stocksToAdd.map(s => ({
          symbol: s.symbol,
          price: s.currentPrice,
          marketCap: s.marketCap || undefined,
        })),
      ];

      // Recalculate weights
      const rebalanced = calculateWeights(allStocks, etf.weightingMethod as any);

      // ✅ PERFORMANCE: Use transaction with deleteMany + createMany instead of individual upserts
      // This avoids N+1 queries and is much faster
      const allDbStocks = [...stocksToAdd, ...currentCompositions.map(c => c.stock)];

      const compositionsData = rebalanced
        .map(stock => {
          const dbStock = allDbStocks.find(s => s.symbol === stock.symbol);
          if (!dbStock) return null;

          return {
            etfId: params.id,
            stockId: dbStock.id,
            weight: stock.weight,
          };
        })
        .filter((comp): comp is NonNullable<typeof comp> => comp !== null);

      // Delete all existing compositions and create new ones in a transaction
      await prisma.$transaction([
        prisma.eTFComposition.deleteMany({
          where: { etfId: params.id },
        }),
        prisma.eTFComposition.createMany({
          data: compositionsData,
        }),
      ]);
    }

    // Return updated ETF
    const updatedETF = await prisma.eTF.findUnique({
      where: { id: params.id },
      include: {
        compositions: {
          include: {
            stock: true,
          },
        },
      },
    });

    const response = NextResponse.json(updatedETF);
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    // ✅ HANDLE VALIDATION ERRORS
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        formatValidationError(error),
        { status: 400 }
      );
    }

    console.error('Error updating ETF:', error);
    return NextResponse.json(
      { error: 'Failed to update ETF' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/etfs/[id] - Delete custom ETF
 * Requires authentication and ownership
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // ✅ CHECK RATE LIMIT (10 requests per 10 seconds)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await apiRateLimit.limit(identifier);

    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(
        rateLimitResult,
        'Too many delete requests. Please slow down.'
      );
    }

    // AUTHENTICATION - Require user to be logged in
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    const etf = await prisma.eTF.findUnique({
      where: { id: params.id },
    });

    if (!etf) {
      return NextResponse.json({ error: 'ETF not found' }, { status: 404 });
    }

    // AUTHORIZATION - Check if user owns this ETF
    if (etf.isCustom && etf.createdBy !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You do not own this ETF' },
        { status: 403 }
      );
    }

    // PREVENT DELETION OF PREDEFINED ETFs
    if (!etf.isCustom) {
      return NextResponse.json(
        { error: 'Cannot delete predefined ETFs' },
        { status: 403 }
      );
    }

    await prisma.eTF.delete({
      where: { id: params.id },
    });

    const response = NextResponse.json({ success: true });
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    console.error('Error deleting ETF:', error);
    return NextResponse.json(
      { error: 'Failed to delete ETF' },
      { status: 500 }
    );
  }
}
