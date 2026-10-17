import { lt } from "drizzle-orm";
import { nextsignalLogs } from "@/nextsignal/db/schema";
import { getDb } from "@/nextsignal/services/database";

export type PruneLogsInput = {
  retentionDays: number;
};

export type PruneLogsResult = {
  cutoff: string;
  deletedCount: number;
};

export const logsService = {
  async prune(input: PruneLogsInput): Promise<PruneLogsResult> {
    const db = await getDb();
    const cutoff = new Date(Date.now() - input.retentionDays * 24 * 60 * 60 * 1000);
    const deleted = await db
      .delete(nextsignalLogs)
      .where(lt(nextsignalLogs.createdAt, cutoff))
      .returning({ id: nextsignalLogs.id });

    return {
      cutoff: cutoff.toISOString(),
      deletedCount: deleted.length
    };
  }
};
