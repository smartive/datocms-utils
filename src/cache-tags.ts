import { sql } from '@vercel/postgres';
import { type CacheTag } from './types';

export { generateQueryId, parseXCacheTagsResponseHeader } from './utils';

/**
 * Stores the cache tags of a query in the database.
 *
 * @param {string} queryId Unique query ID
 * @param {CacheTag[]} cacheTags Array of cache tags
 * @param {string} tableId Database table ID
 */
export const storeQueryCacheTags = async (queryId: string, cacheTags: CacheTag[], tableId: string) => {
  if (!cacheTags?.length) {
    return;
  }

  const tags = cacheTags.flatMap((_, i) => [queryId, cacheTags[i]]);
  const placeholders = cacheTags.map((_, i) => `($${2 * i + 1}, $${2 * i + 2})`).join(',');

  await sql.query(`INSERT INTO ${tableId} VALUES ${placeholders} ON CONFLICT DO NOTHING`, tags);
};

/**
 * Retrieves the queries that reference cache tags.
 *
 * @param {CacheTag[]} cacheTags Array of cache tags
 * @param {string} tableId Database table ID
 * @returns Array of query IDs
 */
export const queriesReferencingCacheTags = async (cacheTags: CacheTag[], tableId: string): Promise<string[]> => {
  if (!cacheTags?.length) {
    return [];
  }

  const placeholders = cacheTags.map((_, i) => `$${i + 1}`).join(',');

  const { rows }: { rows: { query_id: string }[] } = await sql.query(
    `SELECT DISTINCT query_id FROM ${tableId} WHERE cache_tag IN (${placeholders})`,
    cacheTags,
  );

  return rows.map((row) => row.query_id);
};

/**
 * Deletes the specified cache tags from the database.
 *
 * This removes the cache tag keys entirely. When queries are revalidated and
 * run again, fresh cache tag mappings will be created.
 *
 * @param {CacheTag[]} cacheTags Array of cache tags to delete
 * @param {string} tableId Database table ID
 *
 */
export const deleteCacheTags = async (cacheTags: CacheTag[], tableId: string) => {
  if (cacheTags.length === 0) {
    return;
  }
  const placeholders = cacheTags.map((_, i) => `$${i + 1}`).join(',');

  await sql.query(`DELETE FROM ${tableId} WHERE cache_tag IN (${placeholders})`, cacheTags);
};

/**
 * Deletes the cache tags of a query from the database.
 *
 * @param {string} queryId Unique query ID
 * @param {string} tableId Database table ID
 */
export const deleteQueries = async (queryIds: string[], tableId: string) => {
  if (!queryIds?.length) {
    return;
  }
  const placeholders = queryIds.map((_, i) => `$${i + 1}`).join(',');

  await sql.query(`DELETE FROM ${tableId} WHERE query_id IN (${placeholders})`, queryIds);
};

/**
 * Wipes out all cache tags from the database.
 *
 * @param {string} tableId Database table ID
 */
export async function truncateCacheTags(tableId: string) {
  await sql.query(`DELETE FROM ${tableId}`);
}
