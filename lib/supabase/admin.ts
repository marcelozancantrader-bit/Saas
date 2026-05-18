import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/validators/env";

/**
 * Service-role Supabase client for SERVER-SIDE JOBS only.
 *
 * Bypasses RLS — use ONLY in trusted server contexts (Inngest jobs, cron tasks),
 * never in code reachable from a user request without scoping by org_id manually.
 *
 * The anon-key client (lib/supabase/server.ts) should be used for everything else.
 */

let _adminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY not set — required for server-side jobs (Sprint 3+).",
    );
  }
  if (!_adminClient) {
    _adminClient = createSupabaseClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );
  }
  return _adminClient;
}
