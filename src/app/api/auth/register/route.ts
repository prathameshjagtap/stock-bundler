import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { RegisterSchema, formatValidationError } from '@/lib/validation/schemas';
import { z } from 'zod';
import { authRateLimit, getClientIdentifier, addRateLimitHeaders, rateLimitExceededResponse } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // ✅ CHECK RATE LIMIT (5 attempts per 15 minutes)
    const identifier = getClientIdentifier(request);
    const rateLimitResult = await authRateLimit.limit(identifier);

    if (!rateLimitResult.success) {
      return rateLimitExceededResponse(
        rateLimitResult,
        'Too many registration attempts. Please try again later.'
      );
    }

    const body = await request.json();

    // ✅ VALIDATE INPUT WITH ZOD SCHEMA
    const validatedData = RegisterSchema.parse(body);
    const { email, password, name } = validatedData;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    const response = NextResponse.json(user, { status: 201 });
    return addRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    // ✅ HANDLE VALIDATION ERRORS
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        formatValidationError(error),
        { status: 400 }
      );
    }

    console.error('Error in registration:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}
