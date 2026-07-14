import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

type AuditInput = {
  userId?: string | null;
  userName?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  summary?: string;
};

/** Record a "who did what" entry. Best-effort; never throws into the caller. */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: input.userId ?? null,
      userName: input.userName ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      summary: input.summary,
    });
  } catch (err) {
    console.error("[audit] failed to record", input.action, err);
  }
}
