import { businessProcess, forwardFault, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { shoppingAddItemInputSchema, type ShoppingAddItemInput } from "@/nextsignal/schemas";
import type { ActiveHomeSpace, HomeChangeNotification, ShoppingItem } from "@/nextsignal/domain/home";

export type ShoppingAddItemOutput = {
  item: ShoppingItem;
  addedItems: ShoppingItem[];
  items: ShoppingItem[];
};

export const shoppingAddItem = businessProcess<ShoppingAddItemInput, ShoppingAddItemOutput, AppServices>({
  name: "shopping.addItem",
  metadata: {
    description: "Adds a shopping item and notifies the requested home space.",
    tags: ["shopping", "business"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(shoppingAddItemInputSchema),
  handle: shoppingAddItemHandle
});

async function shoppingAddItemHandle(ctx: ProcessContext<AppServices>, input: ShoppingAddItemInput) {
  const spaceResult = await requireHomeSpace(ctx, input.spaceId);
  if (!spaceResult.ok) return forwardFault(spaceResult);
  const activeSpace = spaceResult.data!;
  const itemsToAdd = getShoppingItemsToAdd(input);

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

  const addedItems = await ctx.services.shopping.addItems({
    spaceId: input.spaceId,
    items: itemsToAdd
  });
  const items = await ctx.services.shopping.listItems({ spaceId: input.spaceId });
  const recipients = await ctx.services.spaces.listNotificationMembers({
    spaceId: input.spaceId,
    excludeUserId: activeSpace.user.id
  });

  ctx.services.email.sendSpaceChangeNotificationAsync(
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

  return value({ item: addedItems[0], addedItems, items });
}

function createShoppingAddNotification(
  activeSpace: ActiveHomeSpace,
  data: ShoppingAddItemOutput
): HomeChangeNotification {
  const count = data.addedItems.length;

  return {
    domain: "shopping",
    action: "add",
    spaceName: activeSpace.space.name,
    changedBy: activeSpace.user.displayName,
    summary: count === 1
      ? `${activeSpace.user.displayName} added ${data.item.name} to the shopping list.`
      : `${activeSpace.user.displayName} added ${count} items to the shopping list.`,
    details: data.addedItems.map((item) => `${item.name} x ${item.quantity}${item.store ? `, ${item.store}` : ""}`),
    snapshot: {
      shoppingItems: data.items
    },
    changedAt: new Date().toISOString()
  };
}

function getShoppingItemsToAdd(input: ShoppingAddItemInput) {
  if (input.items?.length) return input.items;

  return [{
    name: input.name!,
    quantity: input.quantity,
    store: input.store
  }];
}
