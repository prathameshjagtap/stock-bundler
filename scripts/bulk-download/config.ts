/**
 * Configuration for bulk historical data downloads
 */

export interface DownloadConfig {
  // S3/Massive.com configuration
  s3: {
    endpoint: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucket: string;
  };

  // Download settings
  download: {
    dataType: 'day_aggs_v1' | 'minute_aggs_v1' | 'trades_v1' | 'quotes_v1';
    startDate: Date;
    endDate: Date;
    concurrency: number; // Number of parallel downloads
    retryAttempts: number;
    retryDelayMs: number;
  };

  // Database settings
  database: {
    batchSize: number; // Records per batch insert
    connectionPoolSize: number;
  };

  // Logging
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    logToFile: boolean;
    logFilePath?: string;
  };
}

/**
 * Get configuration from environment variables
 */
export function getConfig(overrides?: Partial<DownloadConfig>): DownloadConfig {
  const config: DownloadConfig = {
    s3: {
      endpoint: process.env.MASSIVE_S3_ENDPOINT || 'https://files.massive.com',
      accessKeyId: process.env.MASSIVE_S3_ACCESS_KEY || '',
      secretAccessKey: process.env.MASSIVE_S3_SECRET_KEY || '',
      bucket: 'flatfiles',
    },

    download: {
      dataType: 'day_aggs_v1',
      startDate: new Date('2020-01-01'),
      endDate: new Date(),
      concurrency: parseInt(process.env.DOWNLOAD_CONCURRENCY || '15'),
      retryAttempts: parseInt(process.env.DOWNLOAD_RETRY_ATTEMPTS || '3'),
      retryDelayMs: parseInt(process.env.DOWNLOAD_RETRY_DELAY_MS || '1000'),
    },

    database: {
      batchSize: parseInt(process.env.DB_BATCH_SIZE || '1000'),
      connectionPoolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
    },

    logging: {
      level: (process.env.LOG_LEVEL as any) || 'info',
      logToFile: process.env.LOG_TO_FILE === 'true',
      logFilePath: process.env.LOG_FILE_PATH || './logs/bulk-download.log',
    },
  };

  // Apply overrides
  if (overrides) {
    Object.assign(config, overrides);
  }

  // Validation
  if (!config.s3.accessKeyId || !config.s3.secretAccessKey) {
    throw new Error(
      'Missing S3 credentials. Set MASSIVE_S3_ACCESS_KEY and MASSIVE_S3_SECRET_KEY environment variables.'
    );
  }

  return config;
}

/**
 * Validate configuration
 */
export function validateConfig(config: DownloadConfig): void {
  if (config.download.startDate >= config.download.endDate) {
    throw new Error('Start date must be before end date');
  }

  if (config.download.concurrency < 1 || config.download.concurrency > 50) {
    throw new Error('Concurrency must be between 1 and 50');
  }

  if (config.database.batchSize < 100 || config.database.batchSize > 10000) {
    throw new Error('Batch size must be between 100 and 10000');
  }
}

/**
 * Utility: Generate trading date range (excludes weekends)
 */
export function generateTradingDates(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dayOfWeek = current.getDay();

    // Skip weekends (0 = Sunday, 6 = Saturday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      dates.push(new Date(current));
    }

    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Utility: Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Utility: Get S3 key for a specific date and data type
 */
export function getS3Key(dataType: string, date: Date): string {
  const dateStr = formatDate(date);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  // S3 path: us_stocks_sip/day_aggs_v1/YYYY/MM/YYYY-MM-DD.csv.gz
  return `us_stocks_sip/${dataType}/${year}/${month}/${dateStr}.csv.gz`;
}

/**
 * Utility: Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Utility: Calculate ETA
 */
export function calculateETA(
  completed: number,
  total: number,
  elapsedMs: number
): { eta: number; etaFormatted: string } {
  if (completed === 0) {
    return { eta: 0, etaFormatted: 'calculating...' };
  }

  const avgTimePerItem = elapsedMs / completed;
  const remaining = total - completed;
  const eta = avgTimePerItem * remaining;

  const hours = Math.floor(eta / (1000 * 60 * 60));
  const minutes = Math.floor((eta % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((eta % (1000 * 60)) / 1000);

  const etaFormatted = `${hours}h ${minutes}m ${seconds}s`;

  return { eta, etaFormatted };
}
