import { businessProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireHomeUser } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import type { SpaceDetails } from "@/nextsignal/services/spaces";
import { spacesCreateInputSchema, type SpacesCreateInput } from "@/nextsignal/schemas";

export const spacesCreate = businessProcess<SpacesCreateInput, SpaceDetails, AppServices>({
  name: "spaces.create",
  metadata: {
    description: "Creates a home space and makes the authenticated user the owner.",
    tags: ["spaces", "business"]
  },
  auth: requireUser(),
  validate: validateWith(spacesCreateInputSchema),
  handle: spacesCreateHandle
});

async function spacesCreateHandle(ctx: ProcessContext<AppServices>, input: SpacesCreateInput) {
  const userResult = await requireHomeUser(ctx);
  if (!userResult.ok) return forwardFault(userResult);
  const user = userResult.data!;

  await ctx.logger.info({
    message: "Creating home space.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: { userId: user.id, name: input.name }
  });

  const space = await ctx.services.spaces.create({
    userId: user.id,
    name: input.name
  });

  await ctx.logger.info({
    message: "Created home space.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: { userId: user.id, spaceId: space.id, inviteCode: space.inviteCode }
  });

  return value(space);
}
