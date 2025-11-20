/**
 * Database uploader with PostgreSQL COPY for high-performance bulk inserts
 */

import { PrismaClient, PriceGranularity } from '@prisma/client';
import { Pool } from 'pg';
import { from as copyFrom } from 'pg-copy-streams';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import { DownloadConfig } from './config';

export interface PriceRecord {
  ticker: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
  transactions?: number;
  timestamp: Date;
}

export class DatabaseUploader {
  private prisma: PrismaClient;
  private pgPool: Pool;
  private config: DownloadConfig;
  private stockCache: Map<string, string>; // ticker -> stockId

  constructor(config: DownloadConfig) {
    this.config = config;
    this.prisma = new PrismaClient();
    this.stockCache = new Map();

    // Create PostgreSQL connection pool
    this.pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: config.database.connectionPoolSize,
    });
  }

  /**
   * Bulk insert price records using PostgreSQL COPY (5-10x faster than batch INSERT)
   */
  async bulkInsertPriceHistory(
    records: PriceRecord[],
    granularity: PriceGranularity = 'DAY'
  ): Promise<number> {
    if (records.length === 0) {
      return 0;
    }

    console.log(`[DB] Bulk inserting ${records.length} records (${granularity})...`);

    const client = await this.pgPool.connect();

    try {
      await client.query('BEGIN');

      // 1. Ensure all stocks exist and get their IDs
      await this.ensureStocksExist(records.map(r => r.ticker), client);

      // 2. Create temp table for staging
      await client.query(`
        CREATE TEMP TABLE temp_price_history (
          ticker TEXT,
          open DOUBLE PRECISION,
          high DOUBLE PRECISION,
          low DOUBLE PRECISION,
          close DOUBLE PRECISION,
          volume BIGINT,
          vwap DOUBLE PRECISION,
          transactions INTEGER,
          timestamp TIMESTAMP,
          granularity TEXT
        ) ON COMMIT DROP
      `);

      // 3. Stream data using COPY
      const copyStream = client.query(
        copyFrom(
          `COPY temp_price_history (ticker, open, high, low, close, volume, vwap, transactions, timestamp, granularity) FROM STDIN WITH (FORMAT csv, NULL '')`
        )
      );

      // Create CSV data stream
      const csvData = records.map(r =>
        [
          r.ticker,
          r.open,
          r.high,
          r.low,
          r.close,
          r.volume,
          r.vwap || '',
          r.transactions || '',
          r.timestamp.toISOString(),
          granularity,
        ].join(',')
      );

      const readableStream = Readable.from(csvData.join('\n'));

      await pipeline(readableStream, copyStream);

      // 4. Insert from temp table to main table with deduplication
      const result = await client.query(`
        INSERT INTO "PriceHistory" (
          id, "stockId", price, volume, timestamp, open, high, low, vwap, transactions, granularity
        )
        SELECT
          gen_random_uuid(),
          s.id,
          t.close,
          t.volume,
          t.timestamp,
          t.open,
          t.high,
          t.low,
          NULLIF(t.vwap, 0),
          NULLIF(t.transactions, 0),
          t.granularity::"PriceGranularity"
        FROM temp_price_history t
        JOIN "Stock" s ON s.symbol = t.ticker
        ON CONFLICT ("stockId", timestamp, granularity) DO UPDATE
        SET
          price = EXCLUDED.price,
          volume = EXCLUDED.volume,
          open = EXCLUDED.open,
          high = EXCLUDED.high,
          low = EXCLUDED.low,
          vwap = EXCLUDED.vwap,
          transactions = EXCLUDED.transactions
      `);

      await client.query('COMMIT');

      const inserted = result.rowCount || 0;
      console.log(`[DB] Inserted/updated ${inserted} price records`);

      return inserted;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[DB] Error in bulk insert:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Ensure stocks exist in database (create if missing)
   */
  private async ensureStocksExist(tickers: string[], client?: any): Promise<void> {
    const uniqueTickers = [...new Set(tickers)];
    const missingTickers: string[] = [];

    // Check which tickers are not in cache
    for (const ticker of uniqueTickers) {
      if (!this.stockCache.has(ticker)) {
        missingTickers.push(ticker);
      }
    }

    if (missingTickers.length === 0) {
      return;
    }

    // Find existing stocks
    const existing = await this.prisma.stock.findMany({
      where: {
        symbol: { in: missingTickers },
      },
      select: { id: true, symbol: true },
    });

    // Add to cache
    existing.forEach(stock => {
      this.stockCache.set(stock.symbol, stock.id);
    });

    // Create missing stocks
    const existingSymbols = new Set(existing.map(s => s.symbol));
    const toCreate = missingTickers.filter(t => !existingSymbols.has(t));

    if (toCreate.length > 0) {
      console.log(`[DB] Creating ${toCreate.length} new stock entries...`);

      const created = await this.prisma.stock.createMany({
        data: toCreate.map(ticker => ({
          symbol: ticker,
          name: ticker, // Will be updated later with full details
          currentPrice: 0, // Placeholder
        })),
        skipDuplicates: true,
      });

      // Fetch IDs of created stocks
      const newStocks = await this.prisma.stock.findMany({
        where: {
          symbol: { in: toCreate },
        },
        select: { id: true, symbol: true },
      });

      newStocks.forEach(stock => {
        this.stockCache.set(stock.symbol, stock.id);
      });

      console.log(`[DB] Created ${created.count} new stocks`);
    }
  }

  /**
   * Update stock metadata after bulk insert
   */
  async updateStockMetadata(ticker: string, firstDate: Date, lastDate: Date): Promise<void> {
    await this.prisma.stock.updateMany({
      where: { symbol: ticker },
      data: {
        firstTradeDate: firstDate,
        lastTradeDate: lastDate,
      },
    });
  }

  /**
   * Get progress statistics
   */
  async getProgress(jobId: string): Promise<{
    completed: number;
    failed: number;
    pending: number;
    total: number;
    totalRecords: number;
  }> {
    const job = await this.prisma.flatFileDownloadJob.findUnique({
      where: { id: jobId },
      include: {
        dateProgress: {
          select: { status: true, recordsProcessed: true },
        },
      },
    });

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const completed = job.dateProgress.filter(d => d.status === 'COMPLETED').length;
    const failed = job.dateProgress.filter(d => d.status === 'FAILED').length;
    const pending = job.dateProgress.filter(
      d => d.status === 'PENDING' || d.status === 'DOWNLOADING'
    ).length;

    const totalRecords = job.dateProgress.reduce(
      (sum, d) => sum + d.recordsProcessed,
      0
    );

    return {
      completed,
      failed,
      pending,
      total: job.totalDates,
      totalRecords,
    };
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect();
    await this.pgPool.end();
  }
}

/**
 * Parse CSV row from Massive.com day_aggs format
 * Format: ticker,volume,open,close,high,low,window_start,transactions,vwap
 */
export function parseDayAggRow(row: any): PriceRecord {
  return {
    ticker: row.ticker,
    open: parseFloat(row.open),
    high: parseFloat(row.high),
    low: parseFloat(row.low),
    close: parseFloat(row.close),
    volume: parseInt(row.volume),
    vwap: row.vwap ? parseFloat(row.vwap) : undefined,
    transactions: row.transactions ? parseInt(row.transactions) : undefined,
    timestamp: new Date(row.window_start),
  };
}
