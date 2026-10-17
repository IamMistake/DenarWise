import { apiProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import { requireHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { shoppingListItemsInputSchema, type ShoppingListItemsInput } from "@/nextsignal/schemas";
import type { ShoppingItem } from "@/nextsignal/domain/home";

export const shoppingListItemsApi = apiProcess<ShoppingListItemsInput, ShoppingItem[], AppServices>({
  name: "shopping.listItems",
  metadata: {
    description: "Lists current shopping items.",
    tags: ["shopping", "api"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(shoppingListItemsInputSchema),
  async handle(ctx, input) {
    const spaceResult = await requireHomeSpace(ctx, input.spaceId);
    if (!spaceResult.ok) return forwardFault(spaceResult);

    const items = await ctx.services.shopping.listItems({
      ...input
    });
    await ctx.logger.info({
      message: "Listed shopping items.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        spaceId: input.spaceId,
        itemCount: items.length
      }
    });

    return value(items);
  }
});
