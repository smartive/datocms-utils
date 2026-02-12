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
