import { businessProcess, fail, forwardFault, notFound, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { shoppingAddItemInputSchema, type ShoppingAddItemInput } from "@/nextsignal/schemas";
import type { ActiveSpace, HomeChangeNotification, ShoppingItem } from "@/nextsignal/domain/home";

export type ShoppingAddItemOutput = {
  item: ShoppingItem | undefined;
  addedItems: ShoppingItem[];
  items: ShoppingItem[];
};

export const shoppingAddItem = businessProcess<ShoppingAddItemInput, ShoppingAddItemOutput, AppServices>({
  name: "shopping.addItem",
  metadata: {
    description: "Adds a shopping item and notifies the requested space.",
    tags: ["shopping", "business"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(shoppingAddItemInputSchema),
  handle: shoppingAddItemHandle
});

async function shoppingAddItemHandle(ctx: ProcessContext<AppServices>, input: ShoppingAddItemInput) {
  const spaceResult = await requireSpace(ctx, input.spaceId);
  if (!spaceResult.ok) return forwardFault(spaceResult);
  const activeSpace = spaceResult.data!;
  const itemsToAdd = await ctx.services.shopping.resolveItems(input);
  if (!itemsToAdd) return notFound("The selected product is no longer available. Review the item again.");

  await ctx.logger.info({
    message: "Adding shopping items.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      itemCount: itemsToAdd.length,
      spaceId: input.spaceId,
      userId: activeSpace.user.id
    }
  });

  const confirmation = await ctx.services.shopping.addItems({
    spaceId: input.spaceId,
    items: itemsToAdd,
    userId: activeSpace.user.id,
    confirmationId: input.confirmationId ?? crypto.randomUUID()
  });
  if (!confirmation) return fail("This confirmation was already used for a different selection. Review the items again.");
  const { addedItems, replayed } = confirmation;
  const items = await ctx.services.shopping.listItems({ spaceId: input.spaceId });
  const recipients = await ctx.services.spaces.listNotificationMembers({
    spaceId: input.spaceId,
    excludeUserId: activeSpace.user.id
  });

  if (!replayed) ctx.services.email.sendSpaceChangeNotificationAsync(
    createShoppingAddNotification(activeSpace, { item: addedItems[0], addedItems, items }),
    recipients,
    ctx.logger
  );

  await ctx.logger.info({
    message: "Shopping items added.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      addedCount: addedItems.length,
      spaceId: input.spaceId,
      itemCount: items.length
    }
  });

  const addedIds = new Set(addedItems.map((item) => item.id));
  const enrichedAddedItems = items.filter((item) => addedIds.has(item.id));
  return value({ item: enrichedAddedItems[0], addedItems: enrichedAddedItems, items });
}

function createShoppingAddNotification(
  activeSpace: ActiveSpace,
  data: ShoppingAddItemOutput
): HomeChangeNotification {
  const count = data.addedItems.length;

  return {
    domain: "shopping",
    action: "add",
    spaceName: activeSpace.space.name,
    changedBy: activeSpace.user.displayName,
    summary: count === 1
      ? `${activeSpace.user.displayName} added ${data.item?.name ?? "an item"} to the shopping list.`
      : `${activeSpace.user.displayName} added ${count} items to the shopping list.`,
    details: data.addedItems.map((item) => `${item.name} x ${item.quantity}${item.store ? `, ${item.store}` : ""}`),
    snapshot: {
      shoppingItems: data.items
    },
    changedAt: new Date().toISOString()
  };
}
