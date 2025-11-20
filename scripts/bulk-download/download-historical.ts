#!/usr/bin/env ts-node
/**
 * Main bulk download script for historical stock data
 *
 * Downloads historical price data from Massive.com flat files (S3 bucket)
 * and inserts into PostgreSQL database using high-performance COPY.
 *
 * Usage:
 *   npx ts-node scripts/bulk-download/download-historical.ts \
 *     --data-type day_aggs_v1 \
 *     --start-date 2020-01-01 \
 *     --end-date 2025-11-16 \
 *     --concurrency 15
 */

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
  console.log('\n[1/4] Testing S3 connection...');
  const connectionOk = await s3Client.testConnection();
  if (!connectionOk) {
    console.error('❌ S3 connection failed. Check your credentials.');
    console.error('Make sure MASSIVE_S3_ACCESS_KEY and MASSIVE_S3_SECRET_KEY are set in .env');
    process.exit(1);
  }
  console.log('✅ S3 connection successful');

  // Generate trading dates
  console.log('\n[2/4] Generating trading date list...');
  const tradingDates = generateTradingDates(config.download.startDate, config.download.endDate);
  console.log(`✅ ${tradingDates.length} trading days to download`);

  // Create download job
  console.log('\n[3/4] Creating download job in database...');
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
  console.log(`✅ Job created: ${job.id}`);

  // Start download
  console.log('\n[4/4] Starting parallel downloads...');
  console.log(`Job ID: ${job.id}`);
  console.log(`Monitor progress at: http://localhost:3000/dashboard/bulk-download`);
  console.log('');

  const startTime = Date.now();
  let completed = 0;
  let failed = 0;
  let totalRecords = 0;

  // Process in batches (concurrency control)
  const batchSize = config.download.concurrency;
  for (let i = 0; i < tradingDates.length; i += batchSize) {
    const batch = tradingDates.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (date) => {
        const dateStr = formatDate(date);
        const dateStartTime = Date.now();

        try {
          // Update status to downloading
          await prisma.dateDownloadProgress.updateMany({
            where: { jobId: job.id, date: dateStr },
            data: {
              status: 'DOWNLOADING',
              startedAt: new Date(),
            },
          });

          const records = await downloadAndProcessDate(
            s3Client,
            date,
            config.download.dataType,
            options.dryRun,
            dbUploader
          );

          const duration = Date.now() - dateStartTime;

          // Update progress in database
          await prisma.dateDownloadProgress.updateMany({
            where: { jobId: job.id, date: dateStr },
            data: {
              status: 'COMPLETED',
              recordsProcessed: records,
              completedAt: new Date(),
              durationMs: duration,
            },
          });

          completed++;
          totalRecords += records;

          // Print progress
          const elapsed = Date.now() - startTime;
          const { etaFormatted } = calculateETA(completed, tradingDates.length, elapsed);
          const speed = (records / (duration / 1000)).toFixed(0);

          console.log(
            `✓ ${dateStr} | ${records.toLocaleString()} records | ${speed} rec/s | ` +
            `Progress: ${completed}/${tradingDates.length} | ETA: ${etaFormatted}`
          );

          return { success: true, records };
        } catch (error: any) {
          failed++;
          const errorMsg = error instanceof FileNotFoundError
            ? 'File not found (likely market holiday)'
            : error.message;

          await prisma.dateDownloadProgress.updateMany({
            where: { jobId: job.id, date: dateStr },
            data: {
              status: 'FAILED',
              errorMessage: errorMsg.substring(0, 500), // Limit error message length
              completedAt: new Date(),
            },
          });

          console.error(`✗ ${dateStr} | ${errorMsg}`);
          return { success: false, error: errorMsg };
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
  console.log(`Job ID: ${job.id}`);
  console.log(`Total Time: ${(totalTime / 60).toFixed(2)} minutes (${totalTime.toFixed(2)}s)`);
  console.log(`Completed: ${completed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total Records: ${totalRecords.toLocaleString()}`);
  console.log(`Success Rate: ${((completed / tradingDates.length) * 100).toFixed(2)}%`);
  console.log(`Average Speed: ${(totalRecords / totalTime).toFixed(0)} records/second`);

  if (!options.dryRun) {
    const dbSize = await estimateDatabaseSize();
    console.log(`Estimated DB Size: ${dbSize}`);
  }

  console.log('='.repeat(80));

  if (failed > 0) {
    console.log('\n⚠️  Some dates failed to download (likely market holidays or data gaps)');
    console.log(`Check failed dates: Query DateDownloadProgress where status='FAILED' and jobId='${job.id}'`);
  }

  await dbUploader.close();
  await prisma.$disconnect();

  process.exit(failed === 0 ? 0 : 1);
}

/**
 * Download and process a single date file
 */
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
  const parser = parse({
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  stream.pipe(parser);

  const records: PriceRecord[] = [];

  for await (const row of parser) {
    try {
      records.push(parseDayAggRow(row));
    } catch (error) {
      // Skip malformed rows
      console.warn(`Skipping malformed row for date ${formatDate(date)}`);
    }
  }

  if (records.length === 0) {
    throw new Error('No valid records in file');
  }

  if (dryRun) {
    console.log(`[DRY RUN] Would insert ${records.length} records`);
    return records.length;
  }

  // Bulk insert
  const inserted = await dbUploader.bulkInsertPriceHistory(records, 'DAY');

  return inserted;
}

/**
 * Estimate database size
 */
async function estimateDatabaseSize(): Promise<string> {
  try {
    const result = await prisma.$queryRaw<Array<{ size: bigint }>>`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    return result[0]?.size?.toString() || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// Run main function
main().catch((error) => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
