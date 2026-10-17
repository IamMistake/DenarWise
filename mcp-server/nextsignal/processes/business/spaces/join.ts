import { businessProcess, forwardFault, notFound, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireHomeUser } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import type { SpaceDetails } from "@/nextsignal/services/spaces";
import { spacesJoinInputSchema, type SpacesJoinInput } from "@/nextsignal/schemas";

export const spacesJoin = businessProcess<SpacesJoinInput, SpaceDetails, AppServices>({
  name: "spaces.join",
  metadata: {
    description: "Joins a home space by invite code.",
    tags: ["spaces", "business"]
  },
  auth: requireUser(),
  validate: validateWith(spacesJoinInputSchema),
  handle: spacesJoinHandle
});

async function spacesJoinHandle(ctx: ProcessContext<AppServices>, input: SpacesJoinInput) {
  const userResult = await requireHomeUser(ctx);
  if (!userResult.ok) return forwardFault(userResult);
  const user = userResult.data!;

  await ctx.logger.info({
    message: "Joining home space.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: { userId: user.id }
  });

  const space = await ctx.services.spaces.joinByCode({
    userId: user.id,
    code: input.code
  });

  if (!space) {
    await ctx.logger.warn({
      message: "Home space invite code was not found.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: { userId: user.id }
    });
    return notFound("No home space matched that invite code.");
  }

  await ctx.logger.info({
    message: "Joined home space.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: { userId: user.id, spaceId: space.id }
  });

  return value(space);
}
