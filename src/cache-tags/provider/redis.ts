import { Redis } from 'ioredis';
import type { CacheTag, CacheTagsProvider, CacheTagsProviderErrorHandlingConfig } from '../types.js';
import { AbstractErrorHandlingCacheTagsProvider } from './base.js';

type RedisCacheTagsProviderBaseConfig = {
  /**
   * Redis connection string. For example, `redis://user:pass@host:port/db`.
   */
  readonly connectionUrl: string;
  /**
   * Optional prefix for Redis keys. If provided, all keys used to store cache tags will be prefixed with this value.
   * This can be useful to avoid key collisions if the same Redis instance is used for multiple purposes.
   * For example, if you set `keyPrefix` to `'myapp:'`, a cache tag like `'tag1'` will be stored under the key `'myapp:tag1'`.
   */
  readonly keyPrefix?: string;
};

export type RedisCacheTagsProviderConfig = RedisCacheTagsProviderBaseConfig & CacheTagsProviderErrorHandlingConfig;

/**
 * A `CacheTagsProvider` implementation that uses Redis as the storage backend.
 */
export class RedisCacheTagsProvider extends AbstractErrorHandlingCacheTagsProvider implements CacheTagsProvider {
  private readonly redis;
  private readonly keyPrefix;

  constructor({ connectionUrl, keyPrefix, throwOnError, onError }: RedisCacheTagsProviderConfig) {
    super('RedisCacheTagsProvider', { throwOnError, onError });
    this.redis = new Redis(connectionUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    this.keyPrefix = keyPrefix ?? '';
  }

  private logToConsole(level: 'info' | 'debug', event: string, details: Record<string, unknown>) {
    const entry = {
      timestamp: new Date().toISOString(),
      scope: 'cache-tags',
      provider: this.providerName,
      event,
      ...details,
    };

    if (level === 'debug') {
      console.debug(JSON.stringify(entry));
    } else {
      console.info(JSON.stringify(entry));
    }

    return entry;
  }

  /**
   * Internal logger to capture cache tag activity for debugging.
   * Entries are stored in a Redis list 'debug_logs' and also emitted to stdout for Vercel logs.
   */
  private async logEvent(event: string, details: Record<string, unknown>) {
    const entry = this.logToConsole('info', event, details);

    try {
      await this.redis.lpush('debug_logs', JSON.stringify(entry));
      await this.redis.ltrim('debug_logs', 0, 499);
    } catch (error) {
      this.logToConsole('debug', 'DEBUG_LOG_WRITE_FAILED', {
        originalEvent: event,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  public async storeQueryCacheTags(queryId: string, cacheTags: CacheTag[]) {
    return this.wrap(
      'storeQueryCacheTags',
      [queryId, cacheTags],
      async () => {
        if (!cacheTags?.length) {
          return;
        }

        // Log the moment the write starts to compare against webhook arrival
        await this.logEvent('REDIS_WRITE_START', { queryId, cacheTags });

        const pipeline = this.redis.pipeline();

        for (const tag of cacheTags) {
          pipeline.sadd(`${this.keyPrefix}${tag}`, queryId);
        }

        const results = await pipeline.exec();
        const error = results?.find(([err]) => err)?.[0];
        if (error) {
          throw error;
        }

        await this.logEvent('REDIS_WRITE_COMPLETE', { queryId });
      },
      undefined,
    );
  }

  /**
   * Retrieves query IDs associated with the given cache tags.
   */
  public async queriesReferencingCacheTags(cacheTags: CacheTag[]): Promise<string[]> {
    return this.wrap(
      'queriesReferencingCacheTags',
      [cacheTags],
      async () => {
        if (!cacheTags?.length) {
          return [];
        }

        await this.logEvent('CACHE_TAG_LOOKUP_START', { cacheTags });

        const keys = cacheTags.map((tag) => `${this.keyPrefix}${tag}`);
        const result = await this.redis.sunion(...keys);

        await this.logEvent(result.length > 0 ? 'CACHE_TAG_LOOKUP_RESULT' : 'CACHE_TAG_LOOKUP_EMPTY', {
          cacheTags,
          queryCount: result.length,
          queryIds: result,
        });

        return result;
      },
      [],
    );
  }

  public async deleteCacheTags(cacheTags: CacheTag[]) {
    return this.wrap(
      'deleteCacheTags',
      [cacheTags],
      async () => {
        if (!cacheTags?.length) {
          return 0;
        }

        const keys = cacheTags.map((tag) => `${this.keyPrefix}${tag}`);

        return this.redis.del(...keys);
      },
      0,
    );
  }

  public async truncateCacheTags() {
    return this.wrap(
      'truncateCacheTags',
      [],
      async () => {
        const keys = await this.getKeys();

        if (keys.length === 0) {
          return 0;
        }

        return await this.redis.del(...keys);
      },
      0,
    );
  }

  /**
   * Retrieves all keys matching the given pattern using the Redis SCAN command.
   * This method is more efficient than using the KEYS command, especially for large datasets.
   *
   * @returns An array of matching keys
   */
  private async getKeys(): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const keys: string[] = [];

      const stream = this.redis.scanStream({
        match: `${this.keyPrefix}*`,
        count: 1000,
      });

      stream.on('data', (resultKeys: string[]) => {
        keys.push(...resultKeys);
      });

      stream.on('end', () => {
        resolve(keys);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  }
}
