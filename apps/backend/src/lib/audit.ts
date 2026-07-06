import { prisma } from "./prisma";
import { logger } from "./logger";
import type { AuthRequest } from "../middleware/auth";

export type AuditCategory =
  | "AUTH"
  | "CREDIT"
  | "GIFT"
  | "BOOKING"
  | "EXPERIENCE"
  | "BUSINESS"
  | "USER"
  | "REGISTRATION"
  | "ADMIN";

interface AuditActor {
  id?: string | null;
  email?: string | null;
  role?: string | null;
}

interface AuditEntry {
  actor?: AuditActor | null;
  category: AuditCategory;
  action: string;
  summary: string;
  targetType?: string;
  targetId?: string;
  amount?: number;
  metadata?: Record<string, unknown>;
  ip?: string;
}

/**
 * Record an audit-log entry. Never throws — logging must not break the
 * request that triggered it. Fire-and-forget friendly (returns a promise
 * you can optionally await).
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: entry.actor?.id ?? null,
        actorEmail: entry.actor?.email ?? null,
        actorRole: entry.actor?.role ?? null,
        category: entry.category,
        action: entry.action,
        summary: entry.summary,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        amount: entry.amount ?? null,
        metadata: (entry.metadata as any) ?? undefined,
        ip: entry.ip ?? null,
      },
    });
  } catch (err) {
    logger.error("Failed to write audit log", { action: entry.action, err });
  }
}

/** Build an actor object from an authenticated request. */
export function actorFromReq(req: AuthRequest): AuditActor {
  return {
    id: req.authUser?.userId ?? null,
    email: req.authUser?.email ?? null,
    role: req.authUser?.role ?? null,
  };
}

/** Best-effort client IP from a request. */
export function ipFromReq(req: AuthRequest): string | undefined {
  const fwd = req.headers["x-forwarded-for"];
  if (typeof fwd === "string" && fwd.length) return fwd.split(",")[0]!.trim();
  return req.socket?.remoteAddress ?? undefined;
}
