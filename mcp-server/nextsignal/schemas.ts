import { z } from "zod";

// Put shared schemas here when multiple processes or routes use them.
// The starter uses Zod, but NextSignal only needs the adapter contract.
// You can replace Zod later without changing process lifecycle semantics.
export const healthInputSchema = z.object({}).passthrough();

export type HealthInput = z.infer<typeof healthInputSchema>;

export const marketplaceNotificationSubscribeInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320)
});

export const spaceIdSchema = z.string().trim().min(1);

export const todoAssigneeUserIdSchema = z.string().trim().min(1);

export const ensureCurrentUserInputSchema = z.object({}).passthrough();

export const spacesListInputSchema = z.object({}).passthrough();

export const spacesListMembersInputSchema = z.object({
  spaceId: spaceIdSchema
});

export const spacesLeaveInputSchema = z.object({
  spaceId: spaceIdSchema
});

export const spacesCreateInputSchema = z.object({
  name: z.string().trim().min(1).max(80)
});

export const spacesJoinInputSchema = z.object({
  code: z.string().trim().min(4).max(32)
});

export const shoppingListItemsInputSchema = z.object({
  spaceId: spaceIdSchema,
  store: z.string().min(1).optional()
});

export const packageQuantitySchema = z.union([z.number().int().positive().max(10000), z.string().trim().regex(/^[1-9]\d*$/).refine((value) => Number(value) <= 10000)]);
const shoppingFields = {
  name: z.string().trim().min(1).max(500).optional(),
  query: z.string().trim().min(1).max(500).optional(),
  keywords: z.array(z.string().trim().min(1).max(100)).max(4).optional(),
  quantity: packageQuantitySchema.optional(),
  store: z.string().trim().min(1).max(120).optional(),
  productId: z.string().min(1).nullable().optional()
};
export const shoppingAddItemSchema = z.object(shoppingFields).refine((item) => Boolean(item.query || item.name), { message: "Provide query or name." });
export const shoppingAddItemInputSchema = z.object({
  ...shoppingFields,
  spaceId: spaceIdSchema,
  confirmationId: z.string().uuid().optional(),
  items: z.array(shoppingAddItemSchema).min(1).max(20).optional()
}).refine((input) => Boolean(input.query || input.name || input.items?.length), { message: "Provide a query/name or items." });

export const shoppingSearchProductsInputSchema = z.object({
  spaceId: spaceIdSchema,
  itemId: z.string().min(1),
  query: z.string().trim().min(1).max(500),
  keywords: z.array(z.string().trim().min(1).max(100)).max(4).optional(),
  store: z.string().trim().max(120).optional()
});
export type ShoppingSearchProductsInput = z.infer<typeof shoppingSearchProductsInputSchema>;

export const shoppingClearItemsInputSchema = z.object({
  spaceId: spaceIdSchema,
  all: z.boolean().optional(),
  ids: z.array(z.string().min(1)).optional(),
  names: z.array(z.string().min(1)).optional(),
  store: z.string().min(1).optional()
}).refine(
  (input) => input.all === true || (input.ids?.length ?? 0) > 0 || (input.names?.length ?? 0) > 0,
  { message: "Provide `all: true`, at least one id, or at least one name." }
);

export const shoppingUpdateItemSchema = z.object({
  id: z.string().trim().min(1),
  quantity: packageQuantitySchema.optional(),
  store: z.string().trim().max(120).nullable().optional(),
  productId: z.string().min(1).nullable().optional()
}).refine(
  (input) => input.quantity !== undefined || input.store !== undefined || input.productId !== undefined,
  { message: "Provide a product, quantity or store update." }
);

export const shoppingUpdateItemsInputSchema = z.object({
  spaceId: spaceIdSchema,
  itemIds: z.array(z.string().trim().min(1)).min(1),
  targetSpaceId: spaceIdSchema.optional(),
  updates: z.array(shoppingUpdateItemSchema).min(1).optional()
}).superRefine((input, ctx) => {
  if (!input.targetSpaceId && !input.updates?.length) {
    ctx.addIssue({
      code: "custom",
      message: "Provide a target space or at least one item update."
    });
  }

  const itemIds = new Set(input.itemIds);
  for (const update of input.updates ?? []) {
    if (!itemIds.has(update.id)) {
      ctx.addIssue({
        code: "custom",
        message: "Every updated item must also be included in itemIds."
      });
      break;
    }
  }
});

export const todoListInputSchema = z.object({
  spaceId: spaceIdSchema,
  assigneeUserId: todoAssigneeUserIdSchema.optional(),
  includeCompleted: z.boolean().optional()
});

export const todoAddInputSchema = z.object({
  spaceId: spaceIdSchema,
  title: z.string().min(1),
  assigneeUserId: todoAssigneeUserIdSchema
});

export const todoCompleteInputSchema = z.object({
  spaceId: spaceIdSchema,
  id: z.string().min(1).optional(),
  title: z.string().min(1).optional(),
  assigneeUserId: todoAssigneeUserIdSchema.optional()
}).refine(
  (input) => Boolean(input.id || input.title),
  { message: "Provide either `id` or `title`." }
);

const shoppingItemSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  name: z.string(),
  quantity: z.string(),
  store: z.string().nullable(),
  createdAt: z.string()
});

const todoItemSchema = z.object({
  id: z.string(),
  spaceId: z.string(),
  title: z.string(),
  assigneeUserId: todoAssigneeUserIdSchema,
  assigneeDisplayName: z.string(),
  completedAt: z.string().nullable(),
  createdAt: z.string()
});

export const homeChangeNotificationSchema = z.object({
  domain: z.enum(["shopping", "todos"]),
  action: z.string(),
  spaceName: z.string(),
  changedBy: z.string(),
  summary: z.string(),
  details: z.array(z.string()),
  snapshot: z.object({
    shoppingItems: z.array(shoppingItemSchema).optional(),
    todos: z.array(todoItemSchema).optional()
  }),
  changedAt: z.string()
});

export type ShoppingListItemsInput = z.infer<typeof shoppingListItemsInputSchema>;
export type ShoppingAddItemInput = z.infer<typeof shoppingAddItemInputSchema>;
export type ShoppingClearItemsInput = z.infer<typeof shoppingClearItemsInputSchema>;
export type ShoppingUpdateItemsInput = z.infer<typeof shoppingUpdateItemsInputSchema>;
export type TodoListInput = z.infer<typeof todoListInputSchema>;
export type TodoAddInput = z.infer<typeof todoAddInputSchema>;
export type TodoCompleteInput = z.infer<typeof todoCompleteInputSchema>;
export type HomeChangeNotificationInput = z.infer<typeof homeChangeNotificationSchema>;
export type EnsureCurrentUserInput = z.infer<typeof ensureCurrentUserInputSchema>;
export type SpacesListInput = z.infer<typeof spacesListInputSchema>;
export type SpacesListMembersInput = z.infer<typeof spacesListMembersInputSchema>;
export type SpacesLeaveInput = z.infer<typeof spacesLeaveInputSchema>;
export type SpacesCreateInput = z.infer<typeof spacesCreateInputSchema>;
export type SpacesJoinInput = z.infer<typeof spacesJoinInputSchema>;
export type MarketplaceNotificationSubscribeInput = z.infer<typeof marketplaceNotificationSubscribeInputSchema>;
