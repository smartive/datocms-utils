import { sql } from '@vercel/postgres';
import { type CacheTag, type CacheTagsStore } from '../types.js';

export const createPostgresCacheTagsStore = ({ table }: { table: string }): CacheTagsStore => {
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

    const { rows }: { rows: { query_id: string }[] } = await sql.query(
      `SELECT DISTINCT query_id FROM ${table} WHERE cache_tag IN (${placeholders})`,
      cacheTags,
    );

    return rows.map((row) => row.query_id);
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
