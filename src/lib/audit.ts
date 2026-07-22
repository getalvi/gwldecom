import "server-only";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export type AuditAction =
  | "product.create"
  | "product.update"
  | "product.delete"
  | "product.publish"
  | "ai_import.extract"
  | "ai_import.approve"
  | "ai_import.reject"
  | "page.publish"
  | "auth.role_change";

interface AuditEntry {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

/**
 * Writes an immutable audit log entry. Uses the service-role client because
 * audit_logs has no client-facing insert policy (see supabase/policies.sql) —
 * this function is the ONLY sanctioned way to write to that table.
 * Fire-and-forget: logging failures must never break the calling request.
 */
export async function logAudit(entry: AuditEntry) {
  try {
    const supabase = createServiceRoleClient();
    await supabase.from("audit_logs").insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      metadata: (entry.metadata ?? {}) as Json,
      ip_address: entry.ipAddress ?? null,
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", entry.action, err);
  }
}
