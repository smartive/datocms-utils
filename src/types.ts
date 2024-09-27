export type CacheTag = string & { readonly _: unique symbol };

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
