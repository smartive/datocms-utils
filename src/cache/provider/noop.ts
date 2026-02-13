import { type CacheTag, type CacheTagsStore } from '../types.js';

/**
 * Creates a `CacheTagsStore` implementation that does not perform any actual storage operations.
 *
 * _Note: This implementation is useful for testing purposes or when you want to disable caching without changing the code that interacts with the cache._
 *
 * @returns An object implementing the `CacheTagsStore` interface.
 */
export const createCacheTagsStore = (): CacheTagsStore => {
  const storeQueryCacheTags = async (queryId: string, cacheTags: CacheTag[]) => {
    console.debug('-- storeQueryCacheTags called', { queryId, cacheTags });

    return Promise.resolve();
  };

  const queriesReferencingCacheTags = async (cacheTags: CacheTag[]) => {
    console.debug('-- queriesReferencingCacheTags called', { cacheTags });

    return Promise.resolve([]);
  };

  const deleteCacheTags = async (cacheTags: CacheTag[]) => {
    console.debug('-- deleteCacheTags called', { cacheTags });

    return Promise.resolve(0);
  };

  const truncateCacheTags = async () => {
    console.debug('-- truncateCacheTags called');

    return Promise.resolve(0);
  };

  return {
    storeQueryCacheTags,
    queriesReferencingCacheTags,
    deleteCacheTags,
    truncateCacheTags,
  };
};
