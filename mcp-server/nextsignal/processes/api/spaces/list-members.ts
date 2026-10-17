import { apiProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import { requireHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { spacesListMembersInputSchema, type SpacesListMembersInput } from "@/nextsignal/schemas";
import type { HomeSpaceMember } from "@/nextsignal/domain/home";

export const spacesListMembersApi = apiProcess<SpacesListMembersInput, HomeSpaceMember[], AppServices>({
  name: "spaces.listMembers",
  metadata: {
    description: "Lists members in the requested home space.",
    tags: ["spaces", "api"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(spacesListMembersInputSchema),
  async handle(ctx, input) {
    const spaceResult = await requireHomeSpace(ctx, input.spaceId);
    if (!spaceResult.ok) return forwardFault(spaceResult);

    const members = await ctx.services.spaces.listMembers(input.spaceId);
    await ctx.logger.info({
      message: "Listed space members.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        spaceId: input.spaceId,
        memberCount: members.length
      }
    });

    return value(members);
  }
});
