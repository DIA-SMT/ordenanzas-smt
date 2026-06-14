import { createClient } from "@supabase/supabase-js";

import { env } from "../env";

/** Cliente admin (service role) — solo en el servidor. */
export function createSupabaseAdminClient() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
