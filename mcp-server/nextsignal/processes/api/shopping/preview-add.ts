import { apiProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import { requireHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { shoppingAddItemInputSchema, type ShoppingAddItemInput } from "@/nextsignal/schemas";
import type { ShoppingItem } from "@/nextsignal/domain/home";

export type ShoppingPreviewAddOutput = {
  proposedItems: ShoppingItem[];
  items: ShoppingItem[];
};

export const shoppingPreviewAddApi = apiProcess<ShoppingAddItemInput, ShoppingPreviewAddOutput, AppServices>({
  name: "shopping.previewAdd",
  metadata: {
    description: "Prepares shopping items for review without persisting them.",
    tags: ["shopping", "api", "ui"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(shoppingAddItemInputSchema),
  async handle(ctx, input) {
    const spaceResult = await requireHomeSpace(ctx, input.spaceId);
    if (!spaceResult.ok) return forwardFault(spaceResult);

    const items = await ctx.services.shopping.listItems({ spaceId: input.spaceId });
    const proposedItems = getProposedItems(input);

    await ctx.logger.info({
      message: "Prepared shopping items for UI review.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        itemCount: proposedItems.length,
        spaceId: input.spaceId
      }
    });

    return value({ proposedItems, items });
  }
});

function getProposedItems(input: ShoppingAddItemInput): ShoppingItem[] {
  const items = input.items?.length
    ? input.items
    : [{ name: input.name!, quantity: input.quantity, store: input.store }];
  const createdAt = new Date().toISOString();

  return items.map((item) => ({
    id: `draft-${crypto.randomUUID()}`,
    spaceId: input.spaceId,
    name: item.name.trim(),
    quantity: item.quantity?.trim() || "1",
    store: item.store?.trim() || null,
    createdAt
  }));
}
