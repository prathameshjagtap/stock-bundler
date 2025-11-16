import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Popular ETF compositions (simplified versions)
  // In production, these would be fetched from Alpha Vantage or another data source

  const etfData = [
    {
      ticker: 'SPY',
      name: 'SPDR S&P 500 ETF Trust',
      description: 'Tracks the S&P 500 index',
      weightingMethod: 'MARKET_CAP',
      stocks: [
        { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', weight: 7.2 },
        { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', weight: 6.8 },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', weight: 3.5 },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', weight: 3.2 },
        { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', sector: 'Communication Services', weight: 2.1 },
        { symbol: 'GOOG', name: 'Alphabet Inc. Class C', sector: 'Communication Services', weight: 1.8 },
        { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', weight: 2.5 },
        { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', weight: 1.9 },
        { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', sector: 'Financial', weight: 1.7 },
        { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial', weight: 1.3 },
      ],
    },
    {
      ticker: 'QQQ',
      name: 'Invesco QQQ Trust',
      description: 'Tracks the Nasdaq-100 Index',
      weightingMethod: 'MARKET_CAP',
      stocks: [
        { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', weight: 11.5 },
        { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', weight: 10.2 },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', weight: 5.8 },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', weight: 5.1 },
        { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', weight: 4.2 },
        { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', sector: 'Communication Services', weight: 3.5 },
        { symbol: 'GOOG', name: 'Alphabet Inc. Class C', sector: 'Communication Services', weight: 3.2 },
        { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', weight: 3.8 },
        { symbol: 'AVGO', name: 'Broadcom Inc.', sector: 'Technology', weight: 2.1 },
        { symbol: 'COST', name: 'Costco Wholesale Corporation', sector: 'Consumer Defensive', weight: 1.9 },
      ],
    },
    {
      ticker: 'DIA',
      name: 'SPDR Dow Jones Industrial Average ETF',
      description: 'Tracks the Dow Jones Industrial Average',
      weightingMethod: 'PRICE_WEIGHTED',
      stocks: [
        { symbol: 'UNH', name: 'UnitedHealth Group Inc.', sector: 'Healthcare', weight: 10.2 },
        { symbol: 'GS', name: 'Goldman Sachs Group Inc.', sector: 'Financial', weight: 8.5 },
        { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', weight: 7.1 },
        { symbol: 'HD', name: 'Home Depot Inc.', sector: 'Consumer Cyclical', weight: 6.8 },
        { symbol: 'CAT', name: 'Caterpillar Inc.', sector: 'Industrials', weight: 6.2 },
        { symbol: 'AMGN', name: 'Amgen Inc.', sector: 'Healthcare', weight: 5.9 },
        { symbol: 'V', name: 'Visa Inc. Class A', sector: 'Financial', weight: 5.5 },
        { symbol: 'MCD', name: 'McDonald\'s Corporation', sector: 'Consumer Cyclical', weight: 5.2 },
        { symbol: 'BA', name: 'Boeing Company', sector: 'Industrials', weight: 4.8 },
        { symbol: 'HON', name: 'Honeywell International Inc.', sector: 'Industrials', weight: 4.5 },
      ],
    },
    {
      ticker: 'VTI',
      name: 'Vanguard Total Stock Market ETF',
      description: 'Tracks the CRSP US Total Market Index',
      weightingMethod: 'MARKET_CAP',
      stocks: [
        { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', weight: 6.5 },
        { symbol: 'MSFT', name: 'Microsoft Corporation', sector: 'Technology', weight: 6.1 },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', weight: 3.2 },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', weight: 2.9 },
        { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', sector: 'Communication Services', weight: 1.9 },
        { symbol: 'META', name: 'Meta Platforms Inc.', sector: 'Communication Services', weight: 2.2 },
        { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', weight: 1.7 },
        { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', sector: 'Financial', weight: 1.6 },
        { symbol: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Financial', weight: 1.2 },
        { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', weight: 1.1 },
      ],
    },
  ];

  for (const etf of etfData) {
    console.log(`Creating ETF: ${etf.ticker}...`);

    // Create or update stocks
    const stockIds = new Map<string, string>();

    for (const stockData of etf.stocks) {
      const stock = await prisma.stock.upsert({
        where: { symbol: stockData.symbol },
        update: {
          name: stockData.name,
          sector: stockData.sector,
          currentPrice: 0, // Will be updated by price fetcher
        },
        create: {
          symbol: stockData.symbol,
          name: stockData.name,
          sector: stockData.sector,
          currentPrice: 0, // Will be updated by price fetcher
        },
      });

      stockIds.set(stockData.symbol, stock.id);
    }

    // Create ETF
    const createdETF = await prisma.eTF.upsert({
      where: { ticker: etf.ticker },
      update: {
        name: etf.name,
        description: etf.description,
        weightingMethod: etf.weightingMethod,
      },
      create: {
        ticker: etf.ticker,
        name: etf.name,
        description: etf.description,
        weightingMethod: etf.weightingMethod,
        isCustom: false,
      },
    });

    // Create compositions
    for (const stockData of etf.stocks) {
      const stockId = stockIds.get(stockData.symbol);
      if (!stockId) continue;

      await prisma.eTFComposition.upsert({
        where: {
          etfId_stockId: {
            etfId: createdETF.id,
            stockId: stockId,
          },
        },
        update: {
          weight: stockData.weight,
        },
        create: {
          etfId: createdETF.id,
          stockId: stockId,
          weight: stockData.weight,
        },
      });
    }

    console.log(`✓ Created ${etf.ticker} with ${etf.stocks.length} stocks`);
  }

  console.log('Database seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error during seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
