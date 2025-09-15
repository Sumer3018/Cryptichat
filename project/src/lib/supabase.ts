import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log environment variables status
console.log('Supabase Configuration Status:');
console.log('URL:', supabaseUrl ? '✓ Present' : '✗ Missing');
console.log('Anon Key:', supabaseAnonKey ? '✓ Present' : '✗ Missing');

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Please check your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);