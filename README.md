# smartive DatoCMS Utilities

A set of utilities and helpers to work with DatoCMS in a Next.js project.

## Installation

```bash
npm install @smartive/datocms-utils
```

## Usage

Import and use the utilities you need in your project. The following utilities are available.

## Utilities

### Utilities for DatoCMS Cache Tags

The following utilities are used to work with [DatoCMS cache tags](https://www.datocms.com/docs/content-delivery-api/cache-tags) and a [Vercel Postgres database](https://vercel.com/docs/storage/vercel-postgres).

- `storeQueryCacheTags`: Stores the cache tags of a query in the database.
- `queriesReferencingCacheTags`: Retrieves the queries that reference cache tags.
- `deleteQueries`: Deletes the cache tags of a query from the database.

#### Setup Postgres database

In order for the above utilites to work, you need to setup a the following database. You can use the following SQL script to do that:

```sql
CREATE TABLE IF NOT EXISTS query_cache_tags (
  query_id TEXT NOT NULL,
  cache_tag TEXT NOT NULL,
  PRIMARY KEY (query_id, cache_tag)
);
```

### Utilities for DatoCMS Cache Tags (Redis)

The following utilities provide Redis-based alternatives to the Postgres cache tags implementation above. They work with [DatoCMS cache tags](https://www.datocms.com/docs/content-delivery-api/cache-tags) and any Redis instance.

- `redis.storeQueryCacheTags`: Stores the cache tags of a query in Redis.
- `redis.queriesReferencingCacheTags`: Retrieves the queries that reference cache tags.
- `redis.deleteCacheTags`: Deletes cache tags from Redis.
- `redis.truncateCacheTags`: Wipes out all cache tags from Redis.

The Redis connection is automatically initialized on first use using the `REDIS_URL` environment variable.

#### Environment Variables

Add your Redis connection URL to your `.env.local` file:

```bash
# Required: Redis connection URL
# For Upstash Redis
REDIS_URL=rediss://default:your-token@your-endpoint.upstash.io:6379

# For Redis Cloud or other providers
REDIS_URL=redis://username:password@your-redis-host:6379

# For local development
REDIS_URL=redis://localhost:6379

# Optional: Key prefix for separating production/preview environments
# Useful when using the same Redis instance for multiple environments
REDIS_KEY_PREFIX=prod        # For production
REDIS_KEY_PREFIX=preview     # For preview/staging
# Leave empty for development (no prefix)
```

**Note**: Similar to how the Postgres version uses different table names, use `REDIS_KEY_PREFIX` to separate data between environments when using the same Redis instance.

#### Usage Example

```typescript
// Recommended: Use namespaces for clarity
import { generateQueryId, redis } from '@smartive/datocms-utils';

const queryId = generateQueryId(query, variables);

// Store cache tags for a query
await redis.storeQueryCacheTags(queryId, ['item:42', 'product', 'category:5']);

// Find all queries that reference specific tags
const affectedQueries = await redis.queriesReferencingCacheTags(['item:42']);

// Delete cache tags (keys will be recreated on next query)
await redis.deleteCacheTags(['item:42']);
```

#### Redis Data Structure

The Redis implementation uses Sets to track query-to-tag relationships:

- **Cache tag keys**: `{prefix}{tag}` → Set of query IDs

Where `{prefix}` is the optional `REDIS_KEY_PREFIX` environment variable (e.g., `prod:`, `preview:`).

When cache tags are invalidated, their keys are deleted entirely. Fresh mappings are created when queries run again.

### Other Utilities

- `classNames`: Cleans and joins an array of inputs with possible undefined or boolean values. Useful for tailwind classnames.
- `getTelLink`: Formats a phone number to a tel link.

### Types

- `CacheTag`: A branded type for cache tags.
- `CacheTagsInvalidateWebhook`: The payload of the DatoCMS cache tags invalidate webhook.
