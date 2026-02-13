import { Redis } from 'ioredis';
import { type CacheTag, type CacheTagsStore } from '../types.js';

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
 * Creates a `CacheTagsStore` implementation using Redis as the storage backend.
 *
 * @param {RedisCacheTagsStoreConfig} config Configuration object containing the Redis connection string and optional key prefix.
 * @returns An object implementing the `CacheTagsStore` interface, allowing you to store and manage cache tags in a Redis database.
 */
export const createCacheTagsStore = ({ connectionUrl, keyPrefix = '' }: RedisCacheTagsStoreConfig): CacheTagsStore => {
  const redis = new Redis(connectionUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  const storeQueryCacheTags = async (queryId: string, cacheTags: CacheTag[]) => {
    if (!cacheTags?.length) {
      return;
    }

    const pipeline = redis.pipeline();

    for (const tag of cacheTags) {
      pipeline.sadd(`${keyPrefix}${tag}`, queryId);
    }

    await pipeline.exec();
  };

  const queriesReferencingCacheTags = async (cacheTags: CacheTag[]) => {
    if (!cacheTags?.length) {
      return [];
    }

    const keys = cacheTags.map((tag) => `${keyPrefix}${tag}`);

    return redis.sunion(...keys);
  };

  const deleteCacheTags = async (cacheTags: CacheTag[]) => {
    if (!cacheTags?.length) {
      return 0;
    }

    const keys = cacheTags.map((tag) => `${keyPrefix}${tag}`);

    return redis.del(...keys);
  };

  const truncateCacheTags = async () => {
    const pattern = `${keyPrefix}*`;
    const keys = await redis.keys(pattern);

    if (keys.length === 0) {
      return 0;
    }

    return await redis.del(...keys);
  };

  return {
    storeQueryCacheTags,
    queriesReferencingCacheTags,
    deleteCacheTags,
    truncateCacheTags,
  };
};
