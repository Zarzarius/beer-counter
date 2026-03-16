import { createClient } from '@supabase/supabase-js';
import { beerCatalog } from '../src/data/beerCatalog';

/**
 * One-off migration script to seed the beer_stock table from the static beerCatalog.ts list.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... pnpm ts-node scripts/migrateBeerCatalogToSupabase.ts
 *
 * WARNING: Do NOT expose the service role key to the browser or frontend code.
 */

const supabaseUrl = process.env.SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!supabaseUrl || !serviceKey) {
  // eslint-disable-next-line no-console
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const adminClient = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
  },
});

async function main() {
  // eslint-disable-next-line no-console
  console.log(`Migrating ${beerCatalog.length} beers into beer_stock...`);

  const rows = beerCatalog.map((b) => ({
    name: b.name,
    brewery: b.brewery,
    style: b.style,
    year: b.year === 'N/A' ? null : b.year,
    is_unavailable: false,
  }));

  const { error } = await adminClient.from('beer_stock').insert(rows);
  if (error) {
    // eslint-disable-next-line no-console
    console.error('Migration failed:', error);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log('Migration completed successfully.');
}

main();

