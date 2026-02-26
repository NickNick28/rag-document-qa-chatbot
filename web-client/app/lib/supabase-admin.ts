import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Note: This client should ONLY be used in server-side contexts (API Routes, Server Actions)
// NEVER import this in client components.
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
