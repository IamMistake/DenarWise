import { apiProcess, forbidden, ok, value } from "@gotch/nextsignal";
import type { AppServices } from "@/nextsignal/services";

export type PruneLogsOutput = {
  cutoff: string;
  deletedCount: number;
  retentionDays: number;
};

export const pruneLogsApi = apiProcess<void, PruneLogsOutput, AppServices>({
  name: "logs.prune",
  metadata: {
    description: "Deletes application logs older than the configured retention window.",
    tags: ["logs", "maintenance", "api"],
    owner: "home",
    version: "0.1.0"
  },
  auth(ctx) {
    const secret = readConfigString(ctx.config.get("maintenance.cronsecret"));
    if (!secret) return ok();

    const authorization = ctx.request?.headers.authorization;
    return authorization === `Bearer ${secret}` ? ok() : forbidden("Invalid maintenance secret.");
  },
  validate: () => ok(),
  async handle(ctx) {
    const retentionDays = Number(ctx.config.get("logging.retentiondays", 3));
    const result = await ctx.services.logs.prune({ retentionDays });

    await ctx.logger.info({
      message: "Pruned application logs.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        retentionDays,
        cutoff: result.cutoff,
        deletedCount: result.deletedCount
      }
    });

    return value({
      ...result,
      retentionDays
    });
  }
});

function readConfigString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
