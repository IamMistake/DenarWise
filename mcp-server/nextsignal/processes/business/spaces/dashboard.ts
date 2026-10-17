import { businessProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireHomeUser } from "@/nextsignal/processes/business/context";
import { spacesListInputSchema, type SpacesListInput } from "@/nextsignal/schemas";
import type { AppServices } from "@/nextsignal/services";
import type { SpaceDashboard } from "@/nextsignal/services/spaces";

export const spacesDashboard = businessProcess<SpacesListInput, SpaceDashboard[], AppServices>({
  name: "spaces.dashboard",
  auth: requireUser(),
  validate: validateWith(spacesListInputSchema),
  handle: spacesDashboardHandle
});

async function spacesDashboardHandle(ctx: ProcessContext<AppServices>) {
  const user = await requireHomeUser(ctx);
  if (!user.ok) return forwardFault(user);
  return value(await ctx.services.spaces.listDashboard(user.data!.id));
}
