export type WeightingMethod = 'MARKET_CAP' | 'PRICE_WEIGHTED' | 'EQUAL';

export interface StockWithWeight {
  symbol: string;
  price: number;
  marketCap?: number;
  shares?: number;
  weight: number; // percentage (0-100)
}

/**
 * Calculate ETF value based on composition and weighting method
 */
export function calculateETFValue(
  stocks: StockWithWeight[],
  method: WeightingMethod
): number {
  if (stocks.length === 0) return 0;

  switch (method) {
    case 'MARKET_CAP':
      return calculateMarketCapWeighted(stocks);
    case 'PRICE_WEIGHTED':
      return calculatePriceWeighted(stocks);
    case 'EQUAL':
      return calculateEqualWeighted(stocks);
    default:
      throw new Error(`Unknown weighting method: ${method}`);
  }
}

/**
 * Market cap weighted ETF
 * Each stock's weight is proportional to its market capitalization
 */
function calculateMarketCapWeighted(stocks: StockWithWeight[]): number {
  const totalMarketCap = stocks.reduce((sum, stock) =>
    sum + (stock.marketCap || 0), 0);

  if (totalMarketCap === 0) return 0;

  return stocks.reduce((value, stock) => {
    const weight = (stock.marketCap || 0) / totalMarketCap;
    return value + (stock.price * weight);
  }, 0);
}

/**
 * Price weighted ETF
 * Each stock's weight is proportional to its price
 */
function calculatePriceWeighted(stocks: StockWithWeight[]): number {
  const totalPrice = stocks.reduce((sum, stock) => sum + stock.price, 0);

  if (totalPrice === 0) return 0;

  return stocks.reduce((value, stock) => {
    const weight = stock.price / totalPrice;
    return value + (stock.price * weight);
  }, 0);
}

/**
 * Equal weighted ETF
 * Each stock has the same weight regardless of price or market cap
 */
function calculateEqualWeighted(stocks: StockWithWeight[]): number {
  if (stocks.length === 0) return 0;

  const weight = 1 / stocks.length;
  return stocks.reduce((value, stock) => value + (stock.price * weight), 0);
}

/**
 * Calculate weights for stocks based on weighting method
 */
export function calculateWeights(
  stocks: Array<{ symbol: string; price: number; marketCap?: number }>,
  method: WeightingMethod
): StockWithWeight[] {
  switch (method) {
    case 'MARKET_CAP':
      return calculateMarketCapWeights(stocks);
    case 'PRICE_WEIGHTED':
      return calculatePriceWeights(stocks);
    case 'EQUAL':
      return calculateEqualWeights(stocks);
    default:
      throw new Error(`Unknown weighting method: ${method}`);
  }
}

function calculateMarketCapWeights(
  stocks: Array<{ symbol: string; price: number; marketCap?: number }>
): StockWithWeight[] {
  const totalMarketCap = stocks.reduce((sum, stock) =>
    sum + (stock.marketCap || 0), 0);

  return stocks.map(stock => ({
    ...stock,
    weight: totalMarketCap > 0 ? ((stock.marketCap || 0) / totalMarketCap) * 100 : 0,
  }));
}

function calculatePriceWeights(
  stocks: Array<{ symbol: string; price: number; marketCap?: number }>
): StockWithWeight[] {
  const totalPrice = stocks.reduce((sum, stock) => sum + stock.price, 0);

  return stocks.map(stock => ({
    ...stock,
    weight: totalPrice > 0 ? (stock.price / totalPrice) * 100 : 0,
  }));
}

function calculateEqualWeights(
  stocks: Array<{ symbol: string; price: number; marketCap?: number }>
): StockWithWeight[] {
  const weight = stocks.length > 0 ? 100 / stocks.length : 0;

  return stocks.map(stock => ({
    ...stock,
    weight,
  }));
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

/**
 * Rebalance ETF composition based on current prices and weighting method
 */
export function rebalanceETF(
  stocks: StockWithWeight[],
  method: WeightingMethod
): StockWithWeight[] {
  return calculateWeights(stocks, method);
}
