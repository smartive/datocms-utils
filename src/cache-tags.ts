import { sql } from '@vercel/postgres';
import { createHash } from 'crypto';
import { DocumentNode, print } from 'graphql';
import { CacheTag } from './types';

/**
 * Converts the value of DatoCMS's `X-Cache-Tags` header into an array of strings typed as `CacheTag`.
 * For example, it transforms `'tag-a tag-2 other-tag'` into `['tag-a', 'tag-2', 'other-tag']`.
 *
 * @param string String value of the `X-Cache-Tags` header
 * @returns Array of strings typed as `CacheTag`
 */

export function parseXCacheTagsResponseHeader(string?: null | string) {
  if (!string) {
    return [];
  }

  return (string.split(' ') || []).map((tag) => tag as CacheTag);
}

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
 */

export const storeQueryCacheTags = async (queryId: string, cacheTags: CacheTag[]) => {
  await sql.query(
    `INSERT INTO query_cache_tags VALUES ${cacheTags.map((cacheTag) => `('${queryId}', '${cacheTag}')`).join()} ON CONFLICT DO NOTHING`,
  );
};

/**
 * Retrieves the queries that reference cache tags.
 *
 * @param {CacheTag[]} cacheTags Array of cache tags
 * @returns Array of query IDs
 */

export const queriesReferencingCacheTags = async (cacheTags: CacheTag[]): Promise<string[]> => {
  const { rows }: { rows: { query_id: string }[] } = await sql.query(
    `SELECT DISTINCT query_id FROM query_cache_tags WHERE cache_tag IN (${cacheTags.map((cacheTag) => `'${cacheTag}'`).join(', ')})`,
  );

  return rows.map((row) => row.query_id);
};

/**
 * Deletes the cache tags of a query from the database.
 *
 * @param {string} queryId Unique query ID
 */

export const deleteQueries = async (queryIds: string[]) => {
  await sql.query(`DELETE FROM query_cache_tags WHERE query_id IN (${queryIds.map((id) => `'${id}'`).join(', ')})`);
};
