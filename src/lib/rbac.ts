import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "staff" | "customer";

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Authentication required") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "You do not have permission to perform this action") {
    super(message);
  }
}

/**
 * Resolves the current authenticated user + their role from `profiles`.
 * Throws UnauthorizedError if not logged in.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new UnauthorizedError();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) throw new UnauthorizedError("Profile not found");

  return { id: user.id, email: user.email, role: profile.role as Role, fullName: profile.full_name };
}

/**
 * Guard for Route Handlers / Server Actions. Throws ForbiddenError if the
 * caller's role isn't in `allowed`. This is the application-layer gate;
 * Supabase RLS (supabase/policies.sql) is the database-layer gate behind it.
 *
 * Usage:
 *   const user = await requireRole(["admin", "staff"]);
 */
export async function requireRole(allowed: Role[]) {
  const user = await getCurrentUser();
  if (!allowed.includes(user.role)) throw new ForbiddenError();
  return user;
}

/** Converts a thrown RBAC error into a proper HTTP response. */
export function rbacErrorResponse(err: unknown) {
  if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
    return Response.json({ error: err.message }, { status: err.status });
  }
  console.error("Unhandled RBAC error:", err);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
