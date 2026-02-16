import { neon } from '@neondatabase/serverless';
import { type CacheTag, type CacheTagsProvider } from '../types.js';

type NeonCacheTagsProviderConfig = {
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

  constructor({ connectionUrl, table }: NeonCacheTagsProviderConfig) {
    this.sql = neon(connectionUrl, { fullResults: true });
    this.table = NeonCacheTagsProvider.quoteIdentifier(table);
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
    if (!cacheTags?.length) {
      return 0;
    }
    const placeholders = cacheTags.map((_, i) => `$${i + 1}`).join(',');

    return (await this.sql.query(`DELETE FROM ${this.table} WHERE cache_tag IN (${placeholders})`, cacheTags)).rowCount ?? 0;
  }

  public async truncateCacheTags() {
    return (await this.sql.query(`DELETE FROM ${this.table}`)).rowCount ?? 0;
  }

  /**
   * Validates and quotes a PostgreSQL identifier (table name, column name, etc.) to prevent SQL injection.
   * @param identifier The identifier to validate and quote
   * @returns The properly quoted identifier
   * @throws Error if the identifier is invalid
   */
  private static quoteIdentifier(identifier: string): string {
    // Validate that the identifier contains only valid characters
    // PostgreSQL identifiers can contain letters, digits, underscores, and dollar signs
    // They can also contain dots for schema-qualified names
    if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*)?$/.test(identifier)) {
      throw new Error(
        `Invalid table name: ${identifier}. Table names must start with a letter, underscore, or dollar sign and contain only letters, digits, underscores, and dollar signs. Schema-qualified names (e.g., "schema.table") are supported.`,
      );
    }

    // Quote the identifier using double quotes to prevent SQL injection
    // Handle schema-qualified names (e.g., "schema.table")
    // Escape any double quotes within the identifier by doubling them
    return identifier
      .split('.')
      .map((part) => `"${part.replace(/"/g, '""')}"`)
      .join('.');
  }
}
