import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Role = "admin" | "staff" | "customer";

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Authentication required") { super(message); }
}
export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "You do not have permission") { super(message); }
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new UnauthorizedError();
  const { data: profile, error: profileError } = await supabase.from("profiles").select("id, role, full_name").eq("id", user.id).single();
  if (profileError || !profile) throw new UnauthorizedError("Profile not found");
  return { id: user.id, email: user.email, role: profile.role as Role, fullName: profile.full_name };
}

export async function requireRole(allowed: Role[]) {
  const user = await getCurrentUser();
  if (!allowed.includes(user.role)) throw new ForbiddenError();
  return user;
}

export function rbacErrorResponse(err: unknown) {
  if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
    return Response.json({ error: err.message }, { status: (err as { status: number }).status });
  }
  console.error("Unhandled error:", err);
  return Response.json({ error: "Internal server error" }, { status: 500 });
}
