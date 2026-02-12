import { Redis } from 'ioredis';
import { CacheTag } from './types';

let redis: Redis | null = null;

const getRedis = (): Redis => {
  redis ??= new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  return redis;
};

const keyPrefix = process.env.REDIS_KEY_PREFIX ? `${process.env.REDIS_KEY_PREFIX}:` : '';

/**
 * Stores the cache tags of a query in Redis.
 *
 * For each cache tag, adds the query ID to a Redis Set. Sets are unordered
 * collections of unique strings, perfect for tracking which queries use which tags.
 *
 * @param {string} queryId Unique query ID
 * @param {CacheTag[]} cacheTags Array of cache tags
 *
 */
export const storeQueryCacheTagsRedis = async (queryId: string, cacheTags: CacheTag[]): Promise<void> => {
  if (!cacheTags?.length) {
    return;
  }

  const redis = getRedis();
  const pipeline = redis.pipeline();

  for (const tag of cacheTags) {
    pipeline.sadd(`${keyPrefix}${tag}`, queryId);
  }

  await pipeline.exec();
};

/**
 * Retrieves the query IDs that reference any of the specified cache tags.
 *
 * Uses Redis SUNION to efficiently find all queries associated with the given tags.
 *
 * @param {CacheTag[]} cacheTags Array of cache tags to check
 * @returns Array of unique query IDs
 *
 */
export const queriesReferencingCacheTagsRedis = async (cacheTags: CacheTag[]): Promise<string[]> => {
  if (!cacheTags?.length) {
    return [];
  }

  const redis = getRedis();
  const keys = cacheTags.map((tag) => `${keyPrefix}${tag}`);

  return redis.sunion(...keys);
};

/**
 * Deletes the specified cache tags from Redis.
 *
 * This removes the cache tag keys entirely. When queries are revalidated and
 * run again, fresh cache tag mappings will be created.
 *
 * @param {CacheTag[]} cacheTags Array of cache tags to delete
 * @returns Number of keys deleted, or null if there was an error
 *
 */
export const deleteCacheTagsRedis = async (cacheTags: CacheTag[]): Promise<number> => {
  if (!cacheTags?.length) {
    return 0;
  }

  const redis = getRedis();
  const keys = cacheTags.map((tag) => `${keyPrefix}${tag}`);

  return redis.del(...keys);
};

/**
 * Wipes out all cache tags from Redis.
 *
 * ⚠️ **Warning**: This will delete all cache tag data. Use with caution!
 */
export const truncateCacheTagsRedis = async (): Promise<void> => {
  const redis = getRedis();
  const pattern = `${keyPrefix}*`;
  const keys = await redis.keys(pattern);

  if (keys.length > 0) {
    await redis.del(...keys);
  }
};
