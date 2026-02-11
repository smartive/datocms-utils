import { Redis } from 'ioredis';
import { CacheTag } from './types';

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

const keyPrefix = process.env.REDIS_KEY_PREFIX ? `${process.env.REDIS_KEY_PREFIX}:` : '';

/**
 * Stores the cache tags of a query in Redis using a dual-index pattern.
 *
 * This function creates two types of Redis Sets for efficient lookups:
 * - Forward index: `{prefix}cache-tag:{tag}` → Set of query IDs (enables fast "which queries use this tag" lookups)
 * - Reverse index: `{prefix}query:{queryId}` → Set of tags (enables fast cleanup when deleting queries)
 *
 * @param {string} queryId Unique query ID
 * @param {CacheTag[]} cacheTags Array of cache tags
 *
 */
export const storeQueryCacheTagsRedis = async (queryId: string, cacheTags: CacheTag[]): Promise<void> => {
  if (!cacheTags?.length) {
    return;
  }

  const pipeline = redis.pipeline();

  for (const tag of cacheTags) {
    pipeline.sadd(`${keyPrefix}cache-tag:${tag}`, queryId);
  }

  pipeline.sadd(`${keyPrefix}query:${queryId}`, ...cacheTags);

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

  const keys = cacheTags.map((tag) => `${keyPrefix}cache-tag:${tag}`);

  return redis.sunion(...keys);
};

/**
 * Deletes the specified queries and their associated cache tag mappings from Redis.
 *
 * This function:
 * 1. Retrieves all tags associated with each query from the reverse index
 * 2. Removes the query ID from all cache tag sets (forward index)
 * 3. Deletes the reverse index entries for the queries
 *
 * @param {string[]} queryIds Array of query IDs to delete
 *
 */
export const deleteQueriesRedis = async (queryIds: string[]): Promise<void> => {
  if (!queryIds?.length) {
    return;
  }

  const pipeline = redis.pipeline();

  for (const queryId of queryIds) {
    pipeline.smembers(`${keyPrefix}query:${queryId}`);
  }

  const results = await pipeline.exec();

  if (!results) {
    return;
  }

  // Build a new pipeline to delete all references
  const deletePipeline = redis.pipeline();

  queryIds.forEach((queryId, index) => {
    const result = results[index];
    if (result?.[1]) {
      const tags = result[1] as string[];

      for (const tag of tags) {
        deletePipeline.srem(`${keyPrefix}cache-tag:${tag}`, queryId);
      }
    }

    deletePipeline.del(`${keyPrefix}query:${queryId}`);
  });

  await deletePipeline.exec();
};

/**
 * Wipes out all cache tags from Redis.
 *
 * This function deletes all keys matching the patterns:
 * - `{prefix}cache-tag:*` (forward index)
 * - `{prefix}query:*` (reverse index)
 *
 * ⚠️ **Warning**: This will delete all cache tag data. Use with caution!
 */
export const truncateCacheTagsRedis = async (): Promise<void> => {
  const cacheTagKeys = await redis.keys(`${keyPrefix}cache-tag:*`);
  const queryKeys = await redis.keys(`${keyPrefix}query:*`);

  const allKeys = [...cacheTagKeys, ...queryKeys];

  if (allKeys.length > 0) {
    await redis.del(...allKeys);
  }
};
