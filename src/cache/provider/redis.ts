import { Redis } from 'ioredis';
import { type CacheTag, type CacheTagsStore } from '../types.js';

export const createCacheTagsStore = ({ url, keyPrefix = '' }: { url: string; keyPrefix?: string }): CacheTagsStore => {
  const redis = new Redis(url, {
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
