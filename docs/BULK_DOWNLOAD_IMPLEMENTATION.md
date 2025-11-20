# Bulk Historical Data Download - Implementation Complete

**Status:** ✅ Core Infrastructure Ready
**Next Step:** Create remaining scripts and run bulk download

---

## ✅ Completed

1. **Database Schema** - Updated with flat file support
   - Added `PriceGranularity` enum (DAY/MINUTE)
   - Enhanced `PriceHistory` with OHLCV fields
   - Added `FlatFileDownloadJob` and `DateDownloadProgress` models
   - Migration applied successfully

2. **Dependencies Installed**
   - `aws-sdk` - S3 client for Massive.com
   - `csv-parse` - CSV parsing
   - `csv-stringify` - CSV generation
   - `pg-copy-streams` - PostgreSQL COPY for fast inserts
   - `commander` - CLI argument parsing

3. **Core Modules Created**
   - `scripts/bulk-download/config.ts` - Configuration management
   - `scripts/bulk-download/s3-client.ts` - S3 download client
   - `scripts/bulk-download/database-uploader.ts` - Bulk insert with PostgreSQL COPY

---

## 📋 Remaining Files to Create

### 1. Main Download Script (`scripts/bulk-download/download-historical.ts`)

```typescript
import { Command } from 'commander';
import { PrismaClient } from '@prisma/client';
import { parse } from 'csv-parse';
import {
  getConfig,
  validateConfig,
  generateTradingDates,
  getS3Key,
  formatDate,
  calculateETA,
} from './config';
import { S3Client, FileNotFoundError } from './s3-client';
import { DatabaseUploader, parseDayAggRow, PriceRecord } from './database-uploader';

const prisma = new PrismaClient();

async function main() {
  const program = new Command();

  program
    .name('download-historical')
    .description('Download historical stock data from Massive.com flat files')
    .option('--data-type <type>', 'Data type: day_aggs_v1 or minute_aggs_v1', 'day_aggs_v1')
    .option('--start-date <date>', 'Start date (YYYY-MM-DD)', '2020-01-01')
    .option('--end-date <date>', 'End date (YYYY-MM-DD)', new Date().toISOString().split('T')[0])
    .option('--concurrency <number>', 'Parallel downloads', '15')
    .option('--dry-run', 'Test without inserting to database', false)
    .parse();

  const options = program.opts();

  // Get configuration
  const config = getConfig({
    download: {
      dataType: options.dataType as any,
      startDate: new Date(options.startDate),
      endDate: new Date(options.endDate),
      concurrency: parseInt(options.concurrency),
      retryAttempts: 3,
      retryDelayMs: 1000,
    },
  });

  validateConfig(config);

  console.log('='.repeat(80));
  console.log('BULK HISTORICAL DATA DOWNLOAD');
  console.log('='.repeat(80));
  console.log(`Data Type: ${config.download.dataType}`);
  console.log(`Date Range: ${formatDate(config.download.startDate)} to ${formatDate(config.download.endDate)}`);
  console.log(`Concurrency: ${config.download.concurrency}`);
  console.log(`Dry Run: ${options.dryRun ? 'YES' : 'NO'}`);
  console.log('='.repeat(80));

  // Initialize clients
  const s3Client = new S3Client(config);
  const dbUploader = new DatabaseUploader(config);

  // Test S3 connection
  console.log('[1/4] Testing S3 connection...');
  const connectionOk = await s3Client.testConnection();
  if (!connectionOk) {
    console.error('❌ S3 connection failed. Check your credentials.');
    process.exit(1);
  }
  console.log('✅ S3 connection successful\n');

  // Generate trading dates
  console.log('[2/4] Generating trading date list...');
  const tradingDates = generateTradingDates(config.download.startDate, config.download.endDate);
  console.log(`✅ ${tradingDates.length} trading days to download\n`);

  // Create download job
  console.log('[3/4] Creating download job in database...');
  const job = await prisma.flatFileDownloadJob.create({
    data: {
      dataType: config.download.dataType,
      startDate: config.download.startDate,
      endDate: config.download.endDate,
      totalDates: tradingDates.length,
      status: 'IN_PROGRESS',
      concurrency: config.download.concurrency,
      startedAt: new Date(),
      dateProgress: {
        create: tradingDates.map(date => ({
          date: formatDate(date),
          status: 'PENDING',
        })),
      },
    },
  });
  console.log(`✅ Job created: ${job.id}\n`);

  // Start download
  console.log('[4/4] Starting parallel downloads...');
  console.log(`Job ID: ${job.id}`);
  console.log(`Monitor progress: http://localhost:3000/dashboard/bulk-download\n`);

  const startTime = Date.now();
  let completed = 0;
  let failed = 0;
  let totalRecords = 0;

  // Process in batches (concurrency control)
  const batchSize = config.download.concurrency;
  for (let i = 0; i < tradingDates.length; i += batchSize) {
    const batch = tradingDates.slice(i, i + batchSize);

    await Promise.allSettled(
      batch.map(async (date) => {
        const dateStr = formatDate(date);
        try {
          const records = await downloadAndProcessDate(s3Client, date, config.download.dataType, options.dryRun, dbUploader);

          // Update progress in database
          await prisma.dateDownloadProgress.updateMany({
            where: { jobId: job.id, date: dateStr },
            data: {
              status: 'COMPLETED',
              recordsProcessed: records,
              completedAt: new Date(),
            },
          });

          completed++;
          totalRecords += records;

          // Print progress
          const elapsed = Date.now() - startTime;
          const { etaFormatted } = calculateETA(completed, tradingDates.length, elapsed);
          console.log(`✓ ${dateStr} - ${records} records | Progress: ${completed}/${tradingDates.length} | ETA: ${etaFormatted}`);
        } catch (error: any) {
          failed++;
          const errorMsg = error instanceof FileNotFoundError ? 'File not found' : error.message;

          await prisma.dateDownloadProgress.updateMany({
            where: { jobId: job.id, date: dateStr },
            data: {
              status: 'FAILED',
              errorMessage: errorMsg,
              completedAt: new Date(),
            },
          });

          console.error(`✗ ${dateStr} - ${errorMsg}`);
        }
      })
    );
  }

  // Update final job status
  const totalTime = (Date.now() - startTime) / 1000;
  await prisma.flatFileDownloadJob.update({
    where: { id: job.id },
    data: {
      status: failed === 0 ? 'COMPLETED' : 'FAILED',
      completedDates: completed,
      failedDates: failed,
      totalRecords: BigInt(totalRecords),
      completedAt: new Date(),
    },
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('DOWNLOAD COMPLETE');
  console.log('='.repeat(80));
  console.log(`Total Time: ${totalTime.toFixed(2)}s`);
  console.log(`Completed: ${completed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total Records: ${totalRecords.toLocaleString()}`);
  console.log(`Success Rate: ${((completed / tradingDates.length) * 100).toFixed(2)}%`);
  console.log('='.repeat(80));

  await dbUploader.close();
  await prisma.$disconnect();
}

async function downloadAndProcessDate(
  s3Client: S3Client,
  date: Date,
  dataType: string,
  dryRun: boolean,
  dbUploader: DatabaseUploader
): Promise<number> {
  const key = getS3Key(dataType, date);

  // Download and decompress
  const stream = await s3Client.downloadFileWithRetry(key);

  // Parse CSV
  const parser = parse({ columns: true, skip_empty_lines: true });
  stream.pipe(parser);

  const records: PriceRecord[] = [];

  for await (const row of parser) {
    records.push(parseDayAggRow(row));
  }

  if (dryRun) {
    console.log(`[DRY RUN] Would insert ${records.length} records`);
    return records.length;
  }

  // Bulk insert
  const inserted = await dbUploader.bulkInsertPriceHistory(records, 'DAY');

  return inserted;
}

main().catch(console.error);
```

### 2. Ticker Discovery Script (`scripts/bulk-download/discover-tickers.ts`)

```typescript
import { PrismaClient } from '@prisma/client';
import { getStockProviderSingleton } from '../../src/lib/stockDataProvider';

const prisma = new PrismaClient();

async function discoverAndStoreAllTickers() {
  console.log('Discovering all US stocks and ETFs from Massive.com API...\n');

  const provider = getStockProviderSingleton();
  let allTickers: any[] = [];
  let page = 1;

  // Fetch all stocks
  console.log('[1/3] Fetching all US stocks...');
  let hasMore = true;
  let cursor: string | undefined;

  while (hasMore) {
    const url = `https://api.massive.com/v3/reference/tickers?active=true&market=stocks&limit=1000${cursor ? `&cursor=${cursor}` : ''}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${process.env.MASSIVE_API_KEY}`,
      },
    });

    const data = await response.json();

    if (data.results) {
      allTickers.push(...data.results);
      console.log(`  Page ${page}: ${data.results.length} stocks (Total: ${allTickers.length})`);
    }

    cursor = data.next_url ? new URL(data.next_url).searchParams.get('cursor') || undefined : undefined;
    hasMore = !!cursor;
    page++;
  }

  console.log(`✅ Found ${allTickers.length} stocks\n`);

  // Fetch ETFs separately
  console.log('[2/3] Fetching top 1000 ETFs...');
  const etfResponse = await fetch(
    `https://api.massive.com/v3/reference/tickers?active=true&type=ETF&limit=1000&sort=market_cap&order=desc`,
    {
      headers: {
        Authorization: `Bearer ${process.env.MASSIVE_API_KEY}`,
      },
    }
  );

  const etfData = await etfResponse.json();
  const etfs = etfData.results || [];
  console.log(`✅ Found ${etfs.length} ETFs\n`);

  // Combine
  const allSecurities = [...allTickers, ...etfs];
  console.log(`[3/3] Storing ${allSecurities.length} securities in database...\n`);

  // Batch create in database
  let created = 0;
  const batchSize = 100;

  for (let i = 0; i < allSecurities.length; i += batchSize) {
    const batch = allSecurities.slice(i, i + batchSize);

    const result = await prisma.stock.createMany({
      data: batch.map(ticker => ({
        symbol: ticker.ticker,
        name: ticker.name,
        sector: ticker.sic_description,
        marketCap: ticker.market_cap,
        currentPrice: 0, // Placeholder
      })),
      skipDuplicates: true,
    });

    created += result.count;
    console.log(`  Progress: ${Math.min(i + batchSize, allSecurities.length)}/${allSecurities.length}`);
  }

  console.log(`\n✅ Stored ${created} new securities in database`);
  console.log(`Total securities in database: ${await prisma.stock.count()}`);

  await prisma.$disconnect();
}

discoverAndStoreAllTickers().catch(console.error);
```

---

## 🚀 Quick Start Guide

### Step 1: Add S3 Credentials to .env

```bash
# Add to .env or .env.local
MASSIVE_S3_ACCESS_KEY="your-access-key-from-massive-dashboard"
MASSIVE_S3_SECRET_KEY="your-secret-key-from-massive-dashboard"
MASSIVE_S3_ENDPOINT="https://files.massive.com"
```

### Step 2: Discover All Tickers (One-time setup)

```bash
npx ts-node scripts/bulk-download/discover-tickers.ts
```

**Expected:** ~9,000 stocks + ETFs stored in database

### Step 3: Run Bulk Download (5 Years)

```bash
npx ts-node scripts/bulk-download/download-historical.ts \
  --data-type day_aggs_v1 \
  --start-date 2020-01-01 \
  --end-date 2025-11-16 \
  --concurrency 15
```

**Expected:**
- 1,250 trading days
- ~11M price records
- ~2-4 hours execution time
- ~1-2 GB database storage

### Step 4: Monitor Progress

While running, check progress at:
```
http://localhost:3000/dashboard/bulk-download
```

---

## 📊 Performance Expectations

| Metric | Value |
|--------|-------|
| **Trading Days (5 years)** | ~1,250 |
| **Securities** | ~9,000 |
| **Total Records** | ~11.25M |
| **Download Time** | 1-2 hours (15 concurrent) |
| **Insert Time** | ~5 minutes (PostgreSQL COPY) |
| **Database Size** | 1-2 GB |
| **Success Rate** | >95% (some dates may be missing) |

---

## 🔄 Daily Incremental Updates

After initial bulk load, setup daily updates via Vercel cron (next session).

---

## 📝 Next Session Tasks

1. Create the two remaining script files above
2. Test with single day first: `--start-date 2025-11-15 --end-date 2025-11-15`
3. Run full 5-year download overnight
4. Build API endpoints for dashboard
5. Create simple dashboard UI
6. Setup Vercel cron for daily updates

**Current Status:** Ready to create final scripts and test!