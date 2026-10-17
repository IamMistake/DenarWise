import { businessProcess, forwardFault, notFound, requireUser, validateWith, value } from "@gotch/nextsignal";
import type { ProcessContext } from "@gotch/nextsignal";
import { requireHomeSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { shoppingClearItemsInputSchema, type ShoppingClearItemsInput } from "@/nextsignal/schemas";
import type { ActiveHomeSpace, HomeChangeNotification, ShoppingItem } from "@/nextsignal/domain/home";

export type ShoppingClearItemsOutput = {
  clearedItems: ShoppingItem[];
  items: ShoppingItem[];
};

export const shoppingClearItems = businessProcess<ShoppingClearItemsInput, ShoppingClearItemsOutput, AppServices>({
  name: "shopping.clearItems",
  metadata: {
    description: "Clears shopping items by id, name, store, or all, then notifies the requested home space.",
    tags: ["shopping", "business"],
    owner: "home",
    version: "0.1.0"
  },
  auth: requireUser(),
  validate: validateWith(shoppingClearItemsInputSchema),
  handle: shoppingClearItemsHandle
});

async function shoppingClearItemsHandle(ctx: ProcessContext<AppServices>, input: ShoppingClearItemsInput) {
  const spaceResult = await requireHomeSpace(ctx, input.spaceId);
  if (!spaceResult.ok) return forwardFault(spaceResult);
  const activeSpace = spaceResult.data!;

  await ctx.logger.info({
    message: "Clearing shopping items.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      all: input.all,
      idCount: input.ids?.length ?? 0,
      nameCount: input.names?.length ?? 0,
      store: input.store,
      spaceId: input.spaceId,
      userId: activeSpace.user.id
    }
  });

  const clearedItems = await ctx.services.shopping.clearItems(input);
  if (clearedItems.length === 0) {
    await ctx.logger.warn({
      message: "No shopping items matched clear request.",
      process: ctx.metadata.processName,
      correlationId: ctx.metadata.correlationId,
      data: {
        all: input.all,
        idCount: input.ids?.length ?? 0,
        nameCount: input.names?.length ?? 0,
        store: input.store,
        spaceId: input.spaceId
      }
    });

    return notFound("No shopping items matched the clear request.");
  }

  const items = await ctx.services.shopping.listItems({ spaceId: input.spaceId });
  const recipients = await ctx.services.spaces.listNotificationMembers({
    spaceId: input.spaceId,
    excludeUserId: activeSpace.user.id
  });
  ctx.services.email.sendSpaceChangeNotificationAsync(
    createShoppingClearNotification(activeSpace, { clearedItems, items }),
    recipients,
    ctx.logger
  );

  await ctx.logger.info({
    message: "Shopping items cleared.",
    process: ctx.metadata.processName,
    correlationId: ctx.metadata.correlationId,
    data: {
      clearedCount: clearedItems.length,
      itemCount: items.length,
      spaceId: input.spaceId
    }
  });

  return value({ clearedItems, items });
}

function createShoppingClearNotification(
  activeSpace: ActiveHomeSpace,
  data: ShoppingClearItemsOutput
): HomeChangeNotification {
  const count = data.clearedItems.length;

  return {
    domain: "shopping",
    action: "clear",
    spaceName: activeSpace.space.name,
    changedBy: activeSpace.user.displayName,
    summary: `${activeSpace.user.displayName} cleared ${count} shopping item${count === 1 ? "" : "s"}.`,
    details: data.clearedItems.map((item) => `${item.name} x ${item.quantity}${item.store ? `, ${item.store}` : ""}`),
    snapshot: {
      shoppingItems: data.items
    },
    changedAt: new Date().toISOString()
  };
}
