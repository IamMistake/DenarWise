import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { homeShoppingItems } from "@/nextsignal/db/schema";
import { getDb } from "@/nextsignal/services/database";
import type { ShoppingItem } from "@/nextsignal/domain/home";

export type ListShoppingItemsInput = {
  spaceId: string;
  store?: string;
};

export type AddShoppingItemInput = {
  spaceId: string;
  name: string;
  quantity?: string;
  store?: string;
};

export type AddShoppingItemsInput = {
  spaceId: string;
  items: Array<{
    name: string;
    quantity?: string;
    store?: string;
  }>;
};

export type ClearShoppingItemsInput = {
  spaceId: string;
  all?: boolean;
  ids?: string[];
  names?: string[];
  store?: string;
};

export type UpdateShoppingItemsInput = {
  spaceId: string;
  itemIds: string[];
  targetSpaceId?: string;
  updates?: Array<{
    id: string;
    quantity?: string;
    store?: string | null;
  }>;
};

export const shoppingService = {
  async listItems(input: ListShoppingItemsInput): Promise<ShoppingItem[]> {
    const db = await getDb();
    const store = normalizeOptionalText(input.store)?.toLowerCase();
    const rows = await db
      .select()
      .from(homeShoppingItems)
      .where(and(
        eq(homeShoppingItems.spaceId, input.spaceId),
        store ? sql`lower(coalesce(${homeShoppingItems.store}, '')) = ${store}` : undefined
      ))
      .orderBy(asc(homeShoppingItems.createdAt));

    return rows.map(mapShoppingItem);
  },

  async addItem(input: AddShoppingItemInput): Promise<ShoppingItem> {
    const [item] = await this.addItems({
      spaceId: input.spaceId,
      items: [{ name: input.name, quantity: input.quantity, store: input.store }]
    });

    return item;
  },

  async addItems(input: AddShoppingItemsInput): Promise<ShoppingItem[]> {
    const db = await getDb();
    const values = input.items.map((item) => ({
      id: crypto.randomUUID(),
      spaceId: input.spaceId,
      name: item.name.trim(),
      quantity: normalizeOptionalText(item.quantity) ?? "1",
      store: normalizeOptionalText(item.store) ?? null
    }));
    const rows = await db
      .insert(homeShoppingItems)
      .values(values)
      .returning();

    return rows.map(mapShoppingItem);
  },

  async clearItems(input: ClearShoppingItemsInput): Promise<ShoppingItem[]> {
    const db = await getDb();
    const ids = input.ids?.map((id) => id.trim()).filter(Boolean) ?? [];
    const names = input.names?.map((name) => name.trim().toLowerCase()).filter(Boolean) ?? [];
    const store = normalizeOptionalText(input.store)?.toLowerCase();
    const matchConditions = [
      ids.length > 0 ? inArray(homeShoppingItems.id, ids) : undefined,
      names.length > 0 ? inArray(sql<string>`lower(${homeShoppingItems.name})`, names) : undefined
    ].filter(Boolean);
    const itemCondition = input.all === true ? undefined : or(...matchConditions);
    const storeCondition = store ? sql`lower(coalesce(${homeShoppingItems.store}, '')) = ${store}` : undefined;
    const rows = await db
      .delete(homeShoppingItems)
      .where(and(eq(homeShoppingItems.spaceId, input.spaceId), itemCondition, storeCondition))
      .returning();

    return rows.map(mapShoppingItem);
  },

  async updateItems(input: UpdateShoppingItemsInput): Promise<ShoppingItem[] | null> {
    const db = await getDb();
    const itemIds = [...new Set(input.itemIds)];
    const targetSpaceId = input.targetSpaceId ?? input.spaceId;

    return db.transaction(async (tx) => {
      const existingItems = await tx
        .select({ id: homeShoppingItems.id })
        .from(homeShoppingItems)
        .where(and(
          eq(homeShoppingItems.spaceId, input.spaceId),
          inArray(homeShoppingItems.id, itemIds)
        ));

      if (existingItems.length !== itemIds.length) return null;

      if (targetSpaceId !== input.spaceId) {
        await tx
          .update(homeShoppingItems)
          .set({ spaceId: targetSpaceId })
          .where(and(
            eq(homeShoppingItems.spaceId, input.spaceId),
            inArray(homeShoppingItems.id, itemIds)
          ));
      }

      for (const update of input.updates ?? []) {
        const values: Partial<typeof homeShoppingItems.$inferInsert> = {};
        if (update.quantity !== undefined) values.quantity = update.quantity.trim();
        if (update.store !== undefined) values.store = normalizeOptionalText(update.store ?? undefined) ?? null;

        await tx
          .update(homeShoppingItems)
          .set(values)
          .where(and(
            eq(homeShoppingItems.spaceId, targetSpaceId),
            eq(homeShoppingItems.id, update.id)
          ));
      }

      const rows = await tx
        .select()
        .from(homeShoppingItems)
        .where(and(
          eq(homeShoppingItems.spaceId, targetSpaceId),
          inArray(homeShoppingItems.id, itemIds)
        ))
        .orderBy(asc(homeShoppingItems.createdAt));

      return rows.map(mapShoppingItem);
    });
  }
};

function mapShoppingItem(row: typeof homeShoppingItems.$inferSelect): ShoppingItem {
  return {
    id: row.id,
    spaceId: row.spaceId,
    name: row.name,
    quantity: row.quantity,
    store: row.store,
    createdAt: row.createdAt.toISOString()
  };
}

function normalizeOptionalText(value: string | undefined) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
