import { businessProcess, ok, value } from "@gotch/nextsignal";
import type { AppServices, HealthSnapshot } from "@/nextsignal/services";

export type HealthBusinessInput = {
  appName: string;
};

// Business processes are reusable application operations.
// API processes, distributed processes, recurring processes, and tests can all
// dispatch this process through the mediator.
export const healthBusiness = businessProcess<HealthBusinessInput, HealthSnapshot, AppServices>({
  name: "health.business",
  metadata: {
    description: "Builds the health snapshot for this application.",
    tags: ["health"],
    owner: "platform",
    version: "0.1.0"
  },
  auth: () => ok(),
  validate: () => ok(),
  async handle(ctx, input) {
    return value(await ctx.services.health.check(input.appName));
  }
});
