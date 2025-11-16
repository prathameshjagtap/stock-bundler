import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * Require authentication for an API route
 * Throws an error if user is not authenticated
 * Returns the session if authenticated
 */
export async function requireAuth() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    throw new Error('Unauthorized');
  }

  return session;
}

/**
 * Get current session (optional authentication)
 * Returns session if authenticated, null otherwise
 */
export async function getSession() {
  return await getServerSession(authOptions);
}

/**
 * Create unauthorized response
 */
export function unauthorized(message: string = 'Unauthorized - Please log in') {
  return NextResponse.json({ error: message }, { status: 401 });
}

/**
 * Create forbidden response
 */
export function forbidden(message: string = 'Forbidden - Insufficient permissions') {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Check if user owns an ETF
 * @param etfId - ETF ID to check
 * @param userId - User ID to check ownership against
 * @returns true if user owns the ETF, false otherwise
 */
export async function checkETFOwnership(etfId: string, userId: string): Promise<boolean> {
  const etf = await prisma.eTF.findUnique({
    where: { id: etfId },
    select: { isCustom: true, createdBy: true },
  });

  if (!etf) {
    return false;
  }

  // Predefined ETFs are not owned by any user
  if (!etf.isCustom) {
    return false;
  }

  return etf.createdBy === userId;
}

/**
 * Check if ETF is predefined (not custom)
 * @param etfId - ETF ID to check
 * @returns true if ETF is predefined, false if custom
 */
export async function isPreDefinedETF(etfId: string): Promise<boolean> {
  const etf = await prisma.eTF.findUnique({
    where: { id: etfId },
    select: { isCustom: true },
  });

  return etf ? !etf.isCustom : false;
}
