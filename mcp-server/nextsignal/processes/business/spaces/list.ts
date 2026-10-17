import { businessProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireHomeUser } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import type { SpaceSummary } from "@/nextsignal/services/spaces";
import { spacesListInputSchema, type SpacesListInput } from "@/nextsignal/schemas";

export const spacesList = businessProcess<SpacesListInput, SpaceSummary[], AppServices>({
  name: "spaces.list",
  metadata: {
    description: "Lists home spaces for the authenticated user.",
    tags: ["spaces", "business"]
  },
  auth: requireUser(),
  validate: validateWith(spacesListInputSchema),
  handle: spacesListHandle
});

async function spacesListHandle(ctx: ProcessContext<AppServices>) {
  const userResult = await requireHomeUser(ctx);
  if (!userResult.ok) return forwardFault(userResult);
  const user = userResult.data!;

  const spaces = await ctx.services.spaces.listForUser(user.id);
  await ctx.logger.info({
    message: "Listed user spaces.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: { userId: user.id, spaceCount: spaces.length }
  });

  return value(spaces);
}
