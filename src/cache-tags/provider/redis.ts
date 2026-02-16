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

  public async storeQueryCacheTags(queryId: string, cacheTags: CacheTag[]) {
    return this.wrap(
      'storeQueryCacheTags',
      [queryId, cacheTags],
      async () => {
        if (cacheTags.length === 0) {
          return;
        }

        const pipeline = this.redis.pipeline();

        for (const tag of cacheTags) {
          pipeline.sadd(`${this.keyPrefix}${tag}`, queryId);
        }

        const results = await pipeline.exec();
        const error = results?.find(([err]) => err)?.[0];
        if (error) {
          throw error;
        }
      },
      undefined,
    );
  }

  public async queriesReferencingCacheTags(cacheTags: CacheTag[]) {
    return this.wrap(
      'queriesReferencingCacheTags',
      [cacheTags],
      async () => {
        if (cacheTags.length === 0) {
          return [];
        }

        const keys = cacheTags.map((tag) => `${this.keyPrefix}${tag}`);

        return this.redis.sunion(...keys);
      },
      [],
    );
  }

  public async deleteCacheTags(cacheTags: CacheTag[]) {
    return this.wrap(
      'deleteCacheTags',
      [cacheTags],
      async () => {
        if (cacheTags.length === 0) {
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
