import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (typeof supabaseUrl !== 'string' || !supabaseUrl.startsWith('http')) {
  throw new Error(
    'PUBLIC_SUPABASE_URL is missing or invalid. Add it to .env (see README).',
  );
}
if (typeof supabasePublishableKey !== 'string' || !supabasePublishableKey.trim()) {
  throw new Error(
    'PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing. Add the Supabase anon key to .env.',
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
