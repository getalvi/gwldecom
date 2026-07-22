import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createRawClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Server Component / Route Handler / Server Action client.
 * Runs AS the logged-in user (their JWT from cookies), so RLS applies
 * exactly as it would client-side. Use this for all normal reads/writes.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component with no response to write to.
            // Safe to ignore because middleware refreshes the session anyway.
          }
        },
      },
    }
  );
}

/**
 * Service-role client. BYPASSES ROW LEVEL SECURITY.
 * Never expose to the client. Only import this inside:
 *   - src/lib/audit.ts (writing audit logs)
 *   - trusted admin-only API routes, AFTER an explicit requireRole() check
 * Every call site using this client MUST be preceded by an application-level
 * authorization check — this client does not know or care who is asking.
 */
export function createServiceRoleClient() {
  return createRawClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
