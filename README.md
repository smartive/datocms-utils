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

### Other Utilities

- `classNames`: Cleans and joins an array of inputs with possible undefined or boolean values. Useful for tailwind classnames.
