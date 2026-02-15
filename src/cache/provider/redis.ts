import { Redis } from 'ioredis';
import { type CacheTag, type CacheTagsProvider } from '../types.js';

type RedisCacheTagsStoreConfig = {
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

/**
 * A `CacheTagsProvider` implementation that uses Redis as the storage backend.
 */
export class RedisCacheTagsProvider implements CacheTagsProvider {
  private readonly redis;
  private readonly keyPrefix;

  constructor({ connectionUrl, keyPrefix }: RedisCacheTagsStoreConfig) {
    this.redis = new Redis(connectionUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    this.keyPrefix = keyPrefix ?? '';
  }

  public async storeQueryCacheTags(queryId: string, cacheTags: CacheTag[]) {
    if (!cacheTags?.length) {
      return;
    }

    const pipeline = this.redis.pipeline();

    for (const tag of cacheTags) {
      pipeline.sadd(`${this.keyPrefix}${tag}`, queryId);
    }

    await pipeline.exec();
  }

  public async queriesReferencingCacheTags(cacheTags: CacheTag[]) {
    if (!cacheTags?.length) {
      return [];
    }

    const keys = cacheTags.map((tag) => `${this.keyPrefix}${tag}`);

    return this.redis.sunion(...keys);
  }

  public async deleteCacheTags(cacheTags: CacheTag[]) {
    if (!cacheTags?.length) {
      return 0;
    }

    const keys = cacheTags.map((tag) => `${this.keyPrefix}${tag}`);

    return this.redis.del(...keys);
  }

  public async truncateCacheTags() {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    return await this.redis.del(...keys);
  }
}
