import { print, type DocumentNode } from 'graphql';
import { createHash } from 'node:crypto';
import { type CacheTag } from './types.js';

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
