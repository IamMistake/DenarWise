import { authFail, forbidden, forwardFault, systemFail, value, type ProcessContext, type Result } from "@gotch/nextsignal";
import type { AuthUser } from "@/nextsignal/adapters/auth";
import type { ActiveHomeSpace, HomeUser } from "@/nextsignal/domain/home";
import type { AppServices } from "@/nextsignal/services";

export async function requireHomeUser(ctx: ProcessContext<AppServices>): Promise<Result<HomeUser>> {
  const userResult = await ctx.auth.requireUser?.(ctx) as Awaited<ReturnType<NonNullable<typeof ctx.auth.requireUser>>> | undefined;
  if (!userResult?.ok) {
    await ctx.logger.warn({
      message: "Authenticated user required.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId
    });
    return authFail("Authentication required.");
  }

  const authUser = userResult.data as AuthUser;

  try {
    const user = await ctx.services.users.ensureFromWorkOS({ workosUserId: authUser.id });
    return value(user);
  } catch (error) {
    await ctx.logger.error({
      message: "Failed to ensure WorkOS user.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: { userId: authUser.id },
      error
    });
    return systemFail(error);
  }
}

export async function requireHomeSpace(ctx: ProcessContext<AppServices>, spaceId: string): Promise<Result<ActiveHomeSpace>> {
  const userResult = await requireHomeUser(ctx);
  if (!userResult.ok) return forwardFault(userResult);
  const user = userResult.data;

  if (!user) {
    return systemFail(new Error("Home user requirement returned no data."));
  }

  const membership = await ctx.services.spaces.getMembership(user.id, spaceId);
  if (!membership) {
    await ctx.logger.warn({
      message: "User attempted to access a home space they are not a member of.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: { userId: user.id, spaceId }
    });
    return forbidden("You are not a member of that home space.");
  }

  try {
    const space = await ctx.services.spaces.getDetails(user.id, spaceId);
    return value({ user, space, membership });
  } catch (error) {
    await ctx.logger.error({
      message: "Failed to load authorized home space.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: { userId: user.id, spaceId },
      error
    });
    return systemFail(error);
  }
}
