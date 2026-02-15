import { neon } from '@neondatabase/serverless';
import { type CacheTag, type CacheTagsProvider } from '../types.js';

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
 * A `CacheTagsProvider` implementation that uses Neon as the storage backend.
 */
export class NeonCacheTagsProvider implements CacheTagsProvider {
  private readonly sql;
  private readonly table;

  constructor({ connectionUrl, table }: NeonCacheTagsStoreConfig) {
    this.sql = neon(connectionUrl, { fullResults: true });
    this.table = table;
  }

  public async storeQueryCacheTags(queryId: string, cacheTags: CacheTag[]) {
    if (!cacheTags?.length) {
      return;
    }

    const tags = cacheTags.flatMap((_, i) => [queryId, cacheTags[i]]);
    const placeholders = cacheTags.map((_, i) => `($${2 * i + 1}, $${2 * i + 2})`).join(',');

    await this.sql.query(`INSERT INTO ${this.table} VALUES ${placeholders} ON CONFLICT DO NOTHING`, tags);
  }

  public async queriesReferencingCacheTags(cacheTags: CacheTag[]): Promise<string[]> {
    if (!cacheTags?.length) {
      return [];
    }

    const placeholders = cacheTags.map((_, i) => `$${i + 1}`).join(',');

    const { rows } = await this.sql.query(
      `SELECT DISTINCT query_id FROM ${this.table} WHERE cache_tag IN (${placeholders})`,
      cacheTags,
    );

    return rows.reduce<string[]>((queryIds, row) => {
      if (typeof row.query_id === 'string') {
        queryIds.push(row.query_id);
      }

      return queryIds;
    }, []);
  }

  public async deleteCacheTags(cacheTags: CacheTag[]) {
    if (cacheTags.length === 0) {
      return 0;
    }
    const placeholders = cacheTags.map((_, i) => `$${i + 1}`).join(',');

    return (await this.sql.query(`DELETE FROM ${this.table} WHERE cache_tag IN (${placeholders})`, cacheTags)).rowCount ?? 0;
  }

  public async truncateCacheTags() {
    return (await this.sql.query(`DELETE FROM ${this.table}`)).rowCount ?? 0;
  }
}
