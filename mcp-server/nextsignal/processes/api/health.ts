import { allowAnonymous, apiProcess, forwardFault, systemFail, validateWith, value } from "@gotch/nextsignal";
import type { AppServices, HealthSnapshot } from "@/nextsignal/services";
import { healthInputSchema, type HealthInput } from "@/nextsignal/schemas";

export type HealthOutput = {
  health: HealthSnapshot;
  runtime: string;
};

export const healthApi = apiProcess<HealthInput, HealthOutput, AppServices>({
  name: "health.check",
  metadata: {
    description: "Public health endpoint that demonstrates API to business mediator chaining.",
    tags: ["health", "api"],
    owner: "platform",
    version: "0.1.0"
  },
  auth: allowAnonymous(),
  validate: validateWith(healthInputSchema),
  async handle(ctx) {
    const appName = ctx.config.get("app.name", "nextsignal-app");
    const health = await ctx.mediator.dispatch<{ appName: string }, HealthSnapshot>("health.business", {
      appName
    });

    if (!health.ok) return forwardFault(health);
    if (!health.data) return systemFail(new Error("Health business process returned no data."));

    await ctx.logger.info({
      message: "Health check completed.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        runtime: ctx.metadata.runtime
      }
    });

    return value({
      health: health.data,
      runtime: ctx.metadata.runtime
    });
  }
});
