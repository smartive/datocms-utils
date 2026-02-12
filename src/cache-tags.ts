import { sql } from '@vercel/postgres';
import { createHash } from 'crypto';
import { type DocumentNode, print } from 'graphql';
import { type CacheTag } from './types';

/**
 * Converts the value of DatoCMS's `X-Cache-Tags` header into an array of strings typed as `CacheTag`.
 * For example, it transforms `'tag-a tag-2 other-tag'` into `['tag-a', 'tag-2', 'other-tag']`.
 *
 * @param string String value of the `X-Cache-Tags` header
 * @returns Array of strings typed as `CacheTag`
 */
export const parseXCacheTagsResponseHeader = (string?: null | string) =>
  (string?.split(' ') ?? []).map((tag) => tag as CacheTag);

/**
 * Generates a unique query ID based on the query document and its variables.
 *
 * @param {DocumentNode} document Query document
 * @param {TVariables} variables Query variables
 * @returns Unique query ID
 */
export const generateQueryId = <TVariables = unknown>(document: DocumentNode, variables?: TVariables): string => {
  return createHash('sha1')
    .update(print(document))
    .update(JSON.stringify(variables) || '')
    .digest('hex');
};

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
