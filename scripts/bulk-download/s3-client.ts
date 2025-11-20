/**
 * S3 Client for downloading files from Massive.com flat files bucket
 */

import AWS from 'aws-sdk';
import zlib from 'zlib';
import { Readable } from 'stream';
import { DownloadConfig, sleep } from './config';

export class S3Client {
  private s3: AWS.S3;
  private config: DownloadConfig;

  constructor(config: DownloadConfig) {
    this.config = config;

    this.s3 = new AWS.S3({
      endpoint: config.s3.endpoint,
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey,
      s3ForcePathStyle: true,
      signatureVersion: 'v4',
      region: 'us-east-1', // Not actually used but required by SDK
    });
  }

  /**
   * Download a file from S3 and return a decompressed stream
   */
  async downloadFile(key: string): Promise<Readable> {
    console.log(`[S3] Downloading: ${key}`);

    const params = {
      Bucket: this.config.s3.bucket,
      Key: key,
    };

    try {
      const stream = this.s3.getObject(params).createReadStream();

      // Decompress gzip stream
      const gunzip = zlib.createGunzip();
      stream.pipe(gunzip);

      return gunzip;
    } catch (error) {
      console.error(`[S3] Error downloading ${key}:`, error);
      throw error;
    }
  }

  /**
   * Download file with retry logic
   */
  async downloadFileWithRetry(key: string): Promise<Readable> {
    const { retryAttempts, retryDelayMs } = this.config.download;

    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        return await this.downloadFile(key);
      } catch (error: any) {
        // Don't retry on 404 (file doesn't exist)
        if (error.statusCode === 404 || error.code === 'NoSuchKey') {
          throw new FileNotFoundError(`File not found: ${key}`);
        }

        // Last attempt - rethrow error
        if (attempt === retryAttempts - 1) {
          throw error;
        }

        // Calculate backoff delay (exponential)
        const delay = retryDelayMs * Math.pow(2, attempt);
        console.log(
          `[S3] Retry ${attempt + 1}/${retryAttempts} for ${key} after ${delay}ms`
        );
        await sleep(delay);
      }
    }

    throw new Error('Max retries exceeded');
  }

  /**
   * Check if a file exists in S3
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.s3
        .headObject({
          Bucket: this.config.s3.bucket,
          Key: key,
        })
        .promise();
      return true;
    } catch (error: any) {
      if (error.statusCode === 404 || error.code === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata (size, last modified, etc.)
   */
  async getFileMetadata(
    key: string
  ): Promise<{ size: number; lastModified: Date } | null> {
    try {
      const response = await this.s3
        .headObject({
          Bucket: this.config.s3.bucket,
          Key: key,
        })
        .promise();

      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified || new Date(),
      };
    } catch (error: any) {
      if (error.statusCode === 404 || error.code === 'NotFound') {
        return null;
      }
      throw error;
    }
  }

  /**
   * List files with a specific prefix
   */
  async listFiles(prefix: string): Promise<string[]> {
    const params = {
      Bucket: this.config.s3.bucket,
      Prefix: prefix,
    };

    try {
      const response = await this.s3.listObjectsV2(params).promise();
      return response.Contents?.map(item => item.Key || '') || [];
    } catch (error) {
      console.error(`[S3] Error listing files with prefix ${prefix}:`, error);
      throw error;
    }
  }

  /**
   * Test S3 connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.s3
        .listObjectsV2({
          Bucket: this.config.s3.bucket,
          MaxKeys: 1,
        })
        .promise();

      console.log('[S3] Connection successful');
      return true;
    } catch (error) {
      console.error('[S3] Connection failed:', error);
      return false;
    }
  }
}

/**
 * Custom error for file not found
 */
export class FileNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileNotFoundError';
  }
}
