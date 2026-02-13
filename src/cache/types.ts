/**
 * A branded type for cache tags. This is created by intersecting `string`
 * with `{ readonly _: unique symbol }`, making it a unique type.
 * Although it is fundamentally a string, it is treated as a distinct type
 * due to the unique symbol.
 */
export type CacheTag = string & { readonly _: unique symbol };

/**
 * A type representing the structure of a webhook payload for cache tag invalidation.
 * It includes the entity type, event type, and the entity details which contain
 * the cache tags to be invalidated.
 */
export type CacheTagsInvalidateWebhook = {
  entity_type: 'cda_cache_tags';
  event_type: 'invalidate';
  entity: {
    id: 'cda_cache_tags';
    type: 'cda_cache_tags';
    attributes: {
      tags: CacheTag[];
    };
  };
};

/**
 * Configuration object for creating a `CacheTagsStore` implementation.
 */
export type CacheTagsStore = {
  /**
   * Stores the cache tags of a query.
   *
   * @param {string} queryId Unique query ID
   * @param {CacheTag[]} cacheTags Array of cache tags
   *
   */
  storeQueryCacheTags(queryId: string, cacheTags: CacheTag[]): Promise<void>;

  /**
   * Retrieves the query IDs that reference any of the specified cache tags.
   *
   * @param {CacheTag[]} cacheTags Array of cache tags to check
   * @returns Array of unique query IDs
   *
   */
  queriesReferencingCacheTags(cacheTags: CacheTag[]): Promise<string[]>;

  /**
   * Deletes the specified cache tags.
   *
   * This removes the cache tag keys entirely. When queries are revalidated and
   * run again, fresh cache tag mappings will be created.
   *
   * @param {CacheTag[]} cacheTags Array of cache tags to delete
   * @returns Number of keys deleted, or null if there was an error
   *
   */
  deleteCacheTags(cacheTags: CacheTag[]): Promise<number>;

  /**
   * Wipes out all cache tags.
   *
   * ⚠️ **Warning**: This will delete all cache tag data. Use with caution!
   */
  truncateCacheTags(): Promise<number>;
};
