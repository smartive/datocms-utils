import { neon } from '@neondatabase/serverless';
import { type CacheTag, type CacheTagsStore } from '../types.js';

type NeonCacheTagsStoreConfig = {
  /**
   * Neon connection string. You can find it in the "Connection" tab of your Neon project dashboard.
   * Has the format `postgresql://user:pass@host/db`
   */
  readonly connectionUrl: string;
  /**
   * Name of the table where cache tags will be stored. The table must have the following schema:
   *
   * ```sql
   * CREATE TABLE your_table_name (
   *   query_id TEXT NOT NULL,
   *   cache_tag TEXT NOT NULL,
   *   PRIMARY KEY (query_id, cache_tag)
   * );
   * ```
   */
  readonly table: string;
};

/**
 * Creates a `CacheTagsStore` implementation using Neon as the storage backend. Neon is a serverless Postgres database service.
 *
 * @param {NeonCacheTagsStoreConfig} config Configuration object containing the Neon connection string and table name.
 * @returns An object implementing the `CacheTagsStore` interface, allowing you to store and manage cache tags in a Neon database.
 */
export const createCacheTagsStore = ({ connectionUrl, table }: NeonCacheTagsStoreConfig): CacheTagsStore => {
  const sql = neon(connectionUrl, { fullResults: true });

  const storeQueryCacheTags = async (queryId: string, cacheTags: CacheTag[]) => {
    if (!cacheTags?.length) {
      return;
    }

    const tags = cacheTags.flatMap((_, i) => [queryId, cacheTags[i]]);
    const placeholders = cacheTags.map((_, i) => `($${2 * i + 1}, $${2 * i + 2})`).join(',');

    await sql.query(`INSERT INTO ${table} VALUES ${placeholders} ON CONFLICT DO NOTHING`, tags);
  };

  const queriesReferencingCacheTags = async (cacheTags: CacheTag[]): Promise<string[]> => {
    if (!cacheTags?.length) {
      return [];
    }

    const placeholders = cacheTags.map((_, i) => `$${i + 1}`).join(',');

    const { rows } = await sql.query(
      `SELECT DISTINCT query_id FROM ${table} WHERE cache_tag IN (${placeholders})`,
      cacheTags,
    );

    return rows.reduce<string[]>((queryIds, row) => {
      if (typeof row.query_id === 'string') {
        queryIds.push(row.query_id);
      }

      return queryIds;
    }, []);
  };

  const deleteCacheTags = async (cacheTags: CacheTag[]) => {
    if (cacheTags.length === 0) {
      return 0;
    }
    const placeholders = cacheTags.map((_, i) => `$${i + 1}`).join(',');

    return (await sql.query(`DELETE FROM ${table} WHERE cache_tag IN (${placeholders})`, cacheTags)).rowCount ?? 0;
  };

  const truncateCacheTags = async () => (await sql.query(`DELETE FROM ${table}`)).rowCount ?? 0;

  return {
    storeQueryCacheTags,
    queriesReferencingCacheTags,
    deleteCacheTags,
    truncateCacheTags,
  };
};
