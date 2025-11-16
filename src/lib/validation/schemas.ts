// src/lib/validation/schemas.ts
import { z } from 'zod';

// ============================================================================
// REUSABLE VALIDATORS
// ============================================================================

const StockSymbol = z.string()
  .min(1, 'Stock symbol required')
  .max(5, 'Stock symbol too long')
  .regex(/^[A-Z]+$/, 'Stock symbol must be uppercase letters');

const Ticker = z.string()
  .min(1, 'Ticker required')
  .max(10, 'Ticker too long')
  .regex(/^[A-Z0-9]+$/, 'Ticker must be uppercase alphanumeric');

const WeightingMethod = z.enum(['MARKET_CAP', 'PRICE_WEIGHTED', 'EQUAL'], {
  errorMap: () => ({ message: 'Invalid weighting method' }),
});

// ============================================================================
// AUTHENTICATION SCHEMAS
// ============================================================================

/**
 * Schema for user registration
 * Enforces strong password requirements
 */
export const RegisterSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email too long')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string()
    .max(100, 'Name too long')
    .trim()
    .optional(),
});

/**
 * Schema for user login
 */
export const LoginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(1, 'Password required'),
});

// ============================================================================
// ETF SCHEMAS
// ============================================================================

/**
 * Schema for creating a new custom ETF
 */
export const CreateETFSchema = z.object({
  ticker: Ticker,
  name: z.string()
    .min(1, 'Name required')
    .max(100, 'Name too long')
    .trim(),
  description: z.string()
    .max(500, 'Description too long')
    .trim()
    .optional(),
  weightingMethod: WeightingMethod,
  stocks: z.array(
    z.object({
      symbol: StockSymbol,
    })
  )
    .min(1, 'At least one stock required')
    .max(100, 'Maximum 100 stocks allowed'),
});

/**
 * Schema for updating ETF composition
 * Must provide either addStocks or removeStocks
 */
export const UpdateETFSchema = z.object({
  addStocks: z.array(StockSymbol)
    .max(100, 'Maximum 100 stocks can be added at once')
    .optional(),
  removeStocks: z.array(StockSymbol)
    .max(100, 'Maximum 100 stocks can be removed at once')
    .optional(),
}).refine(
  (data) => data.addStocks || data.removeStocks,
  'Must provide either addStocks or removeStocks'
);

// ============================================================================
// STOCK SCHEMAS
// ============================================================================

/**
 * Schema for stock search query
 * Prevents injection attacks via search parameter
 */
export const StockSearchSchema = z.object({
  q: z.string()
    .min(1, 'Search query required')
    .max(50, 'Search query too long')
    .regex(/^[A-Za-z0-9\s]+$/, 'Invalid characters in search query')
    .trim(),
});

// ============================================================================
// PORTFOLIO SCHEMAS
// ============================================================================

/**
 * Schema for adding ETF to user portfolio
 */
export const AddToPortfolioSchema = z.object({
  etfId: z.string()
    .cuid('Invalid ETF ID format'),
  customName: z.string()
    .max(100, 'Custom name too long')
    .trim()
    .optional(),
  notes: z.string()
    .max(500, 'Notes too long')
    .trim()
    .optional(),
});

/**
 * Schema for removing ETF from portfolio
 */
export const RemoveFromPortfolioSchema = z.object({
  portfolioId: z.string()
    .cuid('Invalid portfolio ID format'),
});

// ============================================================================
// PERFORMANCE SCHEMAS
// ============================================================================

/**
 * Schema for performance query parameters
 */
export const PerformanceQuerySchema = z.object({
  range: z.enum(['1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'], {
    errorMap: () => ({ message: 'Invalid time range' }),
  }).default('1M'),
});

// ============================================================================
// CRON JOB SCHEMAS
// ============================================================================

/**
 * Schema for cron job authentication header
 */
export const CronAuthSchema = z.object({
  authorization: z.string()
    .regex(/^Bearer .+$/, 'Invalid authorization format'),
});

// ============================================================================
// HELPER TYPES
// ============================================================================

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateETFInput = z.infer<typeof CreateETFSchema>;
export type UpdateETFInput = z.infer<typeof UpdateETFSchema>;
export type StockSearchInput = z.infer<typeof StockSearchSchema>;
export type AddToPortfolioInput = z.infer<typeof AddToPortfolioSchema>;
export type RemoveFromPortfolioInput = z.infer<typeof RemoveFromPortfolioSchema>;
export type PerformanceQueryInput = z.infer<typeof PerformanceQuerySchema>;

// ============================================================================
// VALIDATION HELPER FUNCTIONS
// ============================================================================

/**
 * Validates request body against a schema
 * Returns either the validated data or an error response
 */
export async function validateRequest<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: z.ZodError }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Validates URL search params against a schema
 */
export function validateSearchParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const data = schema.parse(params);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Formats Zod validation errors for API responses
 */
export function formatValidationError(error: z.ZodError) {
  return {
    error: 'Validation failed',
    details: error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}
