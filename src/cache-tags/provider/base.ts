import type { CacheTag, CacheTagsProvider, CacheTagsProviderErrorHandlingConfig } from '../types.js';

/**
 * An abstract base class for `CacheTagsProvider` implementations that adds error handling and logging.
 */
export abstract class AbstractErrorHandlingCacheTagsProvider implements CacheTagsProvider {
  protected readonly throwOnError: boolean;
  protected readonly onError?: CacheTagsProviderErrorHandlingConfig['onError'];

  protected constructor(
    protected readonly providerName: string,
    config: CacheTagsProviderErrorHandlingConfig = {},
  ) {
    this.throwOnError = config.throwOnError ?? true;
    this.onError = config.onError;
  }

  public abstract storeQueryCacheTags(queryId: string, cacheTags: CacheTag[]): Promise<void>;

  public abstract queriesReferencingCacheTags(cacheTags: CacheTag[]): Promise<string[]>;

  public abstract deleteCacheTags(cacheTags: CacheTag[]): Promise<number>;

  public abstract truncateCacheTags(): Promise<number>;

  protected async wrap<T>(method: keyof CacheTagsProvider, args: unknown[], fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      const provider = this.providerName;
      this.onError?.(error, { provider, method, args });

      if (this.throwOnError) {
        throw error;
      }
      console.debug(`Error occurred in ${provider}.${method}.`, { error, args });

      return fallback;
    }
  }
}
