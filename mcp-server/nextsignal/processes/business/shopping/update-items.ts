import { businessProcess, forwardFault, notFound, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { shoppingUpdateItemsInputSchema, type ShoppingUpdateItemsInput } from "@/nextsignal/schemas";
import type { ShoppingItem } from "@/nextsignal/domain/home";

export type ShoppingUpdateItemsOutput = {
  spaceId: string;
  items: ShoppingItem[];
};

export const shoppingUpdateItems = businessProcess<ShoppingUpdateItemsInput, ShoppingUpdateItemsOutput, AppServices>({
  name: "shopping.updateItems",
  metadata: {
    description: "Updates shopping item quantities, stores, or space from an MCP App UI.",
    tags: ["shopping", "business", "ui"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(shoppingUpdateItemsInputSchema),
  handle: shoppingUpdateItemsHandle
});

async function shoppingUpdateItemsHandle(ctx: ProcessContext<AppServices>, input: ShoppingUpdateItemsInput) {
  const sourceSpaceResult = await requireHomeSpace(ctx, input.spaceId);
  if (!sourceSpaceResult.ok) return forwardFault(sourceSpaceResult);

  const targetSpaceId = input.targetSpaceId ?? input.spaceId;
  if (targetSpaceId !== input.spaceId) {
    const targetSpaceResult = await requireHomeSpace(ctx, targetSpaceId);
    if (!targetSpaceResult.ok) return forwardFault(targetSpaceResult);
  }

  const items = await ctx.services.shopping.updateItems({
    ...input,
    targetSpaceId
  });

  if (!items) {
    return notFound("One or more shopping items are no longer available in this space.");
  }

  await ctx.logger.info({
    message: "Shopping items updated from app UI.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      itemCount: items.length,
      sourceSpaceId: input.spaceId,
      targetSpaceId,
      updateCount: input.updates?.length ?? 0
    }
  });

  return value({ spaceId: targetSpaceId, items });
}
