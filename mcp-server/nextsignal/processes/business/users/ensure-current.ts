import { businessProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { HomeUser } from "@/nextsignal/domain/home";
import { requireHomeUser } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { ensureCurrentUserInputSchema, type EnsureCurrentUserInput } from "@/nextsignal/schemas";

export const ensureCurrentUser = businessProcess<EnsureCurrentUserInput, HomeUser, AppServices>({
  name: "users.ensureCurrent",
  metadata: {
    description: "Ensures the authenticated WorkOS user exists locally.",
    tags: ["users", "business"]
  },
  auth: requireUser(),
  validate: validateWith(ensureCurrentUserInputSchema),
  async handle(ctx) {
    const userResult = await requireHomeUser(ctx);
    if (!userResult.ok) return forwardFault(userResult);
    const user = userResult.data!;

    await ctx.logger.info({
      message: "Ensured current user.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: { userId: user.id }
    });

    return value(user);
  }
});
