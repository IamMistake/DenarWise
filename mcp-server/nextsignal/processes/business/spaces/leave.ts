import { businessProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import type { LeaveSpaceResult } from "@/nextsignal/services/spaces";
import { spacesLeaveInputSchema, type SpacesLeaveInput } from "@/nextsignal/schemas";

export const spacesLeave = businessProcess<SpacesLeaveInput, LeaveSpaceResult, AppServices>({
  name: "spaces.leave",
  metadata: {
    description: "Removes the authenticated user from a home space and deletes the space when it has no members.",
    tags: ["spaces", "business"]
  },
  auth: requireUser(),
  validate: validateWith(spacesLeaveInputSchema),
  handle: spacesLeaveHandle
});

async function spacesLeaveHandle(ctx: ProcessContext<AppServices>, input: SpacesLeaveInput) {
  const spaceResult = await requireHomeSpace(ctx, input.spaceId);
  if (!spaceResult.ok) return forwardFault(spaceResult);
  const { user } = spaceResult.data!;

  await ctx.logger.info({
    message: "Leaving home space.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: { userId: user.id, spaceId: input.spaceId }
  });

  const result = await ctx.services.spaces.leave({
    userId: user.id,
    spaceId: input.spaceId
  });

  await ctx.logger.info({
    message: result.deletedSpace ? "Left and deleted empty home space." : "Left home space.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      userId: user.id,
      spaceId: input.spaceId,
      remainingMemberCount: result.remainingMemberCount,
      deletedSpace: result.deletedSpace
    }
  });

  return value(result);
}
