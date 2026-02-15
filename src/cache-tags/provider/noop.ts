import { type CacheTag, type CacheTagsProvider } from '../types.js';

/**
 * A `CacheTagsProvider` implementation that does not perform any actual storage operations.
 *
 * _Note: This implementation is useful for testing purposes or when you want to disable caching without changing the code that interacts with the cache._
 */
export class NoopCacheTagsProvider implements CacheTagsProvider {
  public async storeQueryCacheTags(queryId: string, cacheTags: CacheTag[]) {
    console.debug('-- storeQueryCacheTags called', { queryId, cacheTags });

    return Promise.resolve();
  }

  public async queriesReferencingCacheTags(cacheTags: CacheTag[]): Promise<string[]> {
    console.debug('-- queriesReferencingCacheTags called', { cacheTags });

    return Promise.resolve([]);
  }

  public async deleteCacheTags(cacheTags: CacheTag[]) {
    console.debug('-- deleteCacheTags called', { cacheTags });

    return Promise.resolve(0);
  }

  public async truncateCacheTags() {
    console.debug('-- truncateCacheTags called');

    return Promise.resolve(0);
  }
}
