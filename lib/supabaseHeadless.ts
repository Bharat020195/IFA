// lib/supabaseHeadless.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnon =
  process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnon) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY (server). Check envs or GitHub Actions secrets."
  );
}

export const supabaseHeadless = createClient(supabaseUrl, supabaseAnon, {
  auth: { persistSession: false },
});
