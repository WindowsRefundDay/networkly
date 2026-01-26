import { createClient } from '@supabase/supabase-js';
import type { Database } from './lib/database.types';

// Try to create a client
const supabase = createClient<Database>('http://localhost', 'key');

// Try to query
async function test() {
  const { data } = await supabase.from('users').select('id, name');
  console.log(data);
}
