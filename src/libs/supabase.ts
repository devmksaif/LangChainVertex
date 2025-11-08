import { createClient } from '@supabase/supabase-js';
import 'dotenv/config'; // ✅ this actually loads .env

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment');
  process.exit(1);
}

export const supabase = createClient(supabaseUrl, supabaseKey);
