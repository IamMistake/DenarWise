import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { homeShoppingItems, shoppingConfirmations } from "@/nextsignal/db/schema";
import { getDb } from "@/nextsignal/services/database";
import type { ShoppingItem } from "@/nextsignal/domain/home";
import { catalogRepository } from "@/nextsignal/catalog/repository";
import { hash, normalizeMarket } from "@/nextsignal/catalog/normalize";
import { recommendationService } from "@/nextsignal/catalog/recommendations";
import { stage } from "@/nextsignal/observability/context";
import type { ShoppingAddItemInput, ShoppingUpdateItemsInput, ShoppingClearItemsInput } from "@/nextsignal/schemas";

export type ResolvedShoppingItem = { name: string; quantity: string; store: string | null; productId: string | null; originalQuery: string; keywords: string[] };
export type ListShoppingItemsInput = { spaceId: string; store?: string };

export function createShoppingService(database = getDb, catalog = catalogRepository, recommendations = recommendationService) { return {
  async storedItems(spaceId: string): Promise<ShoppingItem[]> {
    return stage("shopping.persistence.read", { spaceId }, async () => {
      const db = await database();
      return (await db.select().from(homeShoppingItems).where(eq(homeShoppingItems.spaceId, spaceId)).orderBy(asc(homeShoppingItems.createdAt))).map(mapShoppingItem);
    });
  },
  async listItems(input: ListShoppingItemsInput): Promise<ShoppingItem[]> {
    const items = await recommendations.enrich(await this.storedItems(input.spaceId));
    return input.store ? items.filter((item) => item.store && normalizeMarket(item.store) === normalizeMarket(input.store!)) : items;
  },
  async resolveItems(input: ShoppingAddItemInput): Promise<ResolvedShoppingItem[] | null> {
    const items = input.items?.length ? input.items : [input];
    const resolved: ResolvedShoppingItem[] = [];
    for (const item of items) {
      const product = item.productId ? await catalog.product(item.productId) : null;
      if (item.productId && !product) return null;
      const originalQuery = (item.query ?? item.name ?? "").trim();
      resolved.push({ name: product?.product.name ?? originalQuery, originalQuery, quantity: String(item.quantity ?? 1),
        store: item.store?.trim() ? (product ? normalizeMarket(item.store) : item.store.trim()) : null,
        productId: product?.id ?? null, keywords: item.keywords ?? [] });
    }
    return resolved;
  },
  async addItems(input: { spaceId: string; userId: string; confirmationId: string; items: ResolvedShoppingItem[] }) {
    return stage("shopping.persistence.confirm", { spaceId: input.spaceId, itemCount: input.items.length }, async () => {
      const db = await database();
      const payloadHash = hash(JSON.stringify({ spaceId: input.spaceId, items: input.items }));
      return db.transaction(async (tx) => {
        // Serialize retries, including simultaneous requests, across server instances.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${input.userId + ":" + input.confirmationId}, 0))`);
        const [previous] = await tx.select().from(shoppingConfirmations).where(and(eq(shoppingConfirmations.userId, input.userId), eq(shoppingConfirmations.requestId, input.confirmationId)));
        if (previous) {
          if (previous.payloadHash !== payloadHash) return null;
          const rows = previous.itemIds.length ? await tx.select().from(homeShoppingItems).where(and(eq(homeShoppingItems.spaceId, input.spaceId), inArray(homeShoppingItems.id, previous.itemIds))).orderBy(asc(homeShoppingItems.createdAt)) : [];
          return { addedItems: rows.map(mapShoppingItem), replayed: true };
        }
        const rows = await tx.insert(homeShoppingItems).values(input.items.map((item) => ({ id: crypto.randomUUID(), spaceId: input.spaceId, ...item }))).returning();
        await tx.insert(shoppingConfirmations).values({ id: crypto.randomUUID(), userId: input.userId, requestId: input.confirmationId, payloadHash, itemIds: rows.map((row) => row.id) });
        return { addedItems: rows.map(mapShoppingItem), replayed: false };
      });
    });
  },
  async clearItems(input: ShoppingClearItemsInput): Promise<ShoppingItem[]> {
    const candidates = await this.listItems({ spaceId: input.spaceId, store: input.store });
    const names = new Set(input.names?.map((name) => name.trim().toLowerCase()) ?? []);
    const ids = candidates.filter((item) => input.all || input.ids?.includes(item.id) || names.has(item.name.toLowerCase()) || names.has(item.originalQuery?.toLowerCase() ?? "")).map((item) => item.id);
    if (!ids.length) return [];
    return stage("shopping.persistence.clear", { spaceId: input.spaceId, itemCount: ids.length }, async () => {
      const db = await database();
      return (await db.delete(homeShoppingItems).where(and(eq(homeShoppingItems.spaceId, input.spaceId), inArray(homeShoppingItems.id, ids))).returning()).map(mapShoppingItem);
    });
  },
  async updateItems(input: ShoppingUpdateItemsInput): Promise<ShoppingItem[] | null> {
    const products = new Map<string, Awaited<ReturnType<typeof catalogRepository.product>>>();
    for (const update of input.updates ?? []) {
      if (update.productId) {
        const product = await catalog.product(update.productId);
        if (!product) return null;
        products.set(update.productId, product);
      }
    }
    return stage("shopping.persistence.update", { spaceId: input.spaceId, itemCount: input.itemIds.length }, async () => {
      const db = await database();
      const itemIds = [...new Set(input.itemIds)];
      const targetSpaceId = input.targetSpaceId ?? input.spaceId;
      return db.transaction(async (tx) => {
        const existing = await tx.select().from(homeShoppingItems).where(and(eq(homeShoppingItems.spaceId, input.spaceId), inArray(homeShoppingItems.id, itemIds))).for("update");
        if (existing.length !== itemIds.length) return null;
        for (const item of existing) {
          const update = input.updates?.find((candidate) => candidate.id === item.id);
          const values: Partial<typeof homeShoppingItems.$inferInsert> = { spaceId: targetSpaceId };
          if (update?.quantity !== undefined) values.quantity = String(update.quantity);
          if (update?.store !== undefined) values.store = update.store?.trim() || null;
          if (update?.productId !== undefined) {
            values.productId = update.productId;
            values.name = update.productId ? products.get(update.productId)!.product.name : item.originalQuery ?? item.name;
          }
          await tx.update(homeShoppingItems).set(values).where(and(eq(homeShoppingItems.spaceId, input.spaceId), eq(homeShoppingItems.id, item.id)));
        }
        return (await tx.select().from(homeShoppingItems).where(and(eq(homeShoppingItems.spaceId, targetSpaceId), inArray(homeShoppingItems.id, itemIds))).orderBy(asc(homeShoppingItems.createdAt))).map(mapShoppingItem);
      });
    });
  }
}; }
export const shoppingService = createShoppingService();

export function mapShoppingItem(row: typeof homeShoppingItems.$inferSelect): ShoppingItem {
  return { id: row.id, spaceId: row.spaceId, name: row.name, quantity: row.quantity, store: row.store,
    requestedStore: row.store, productId: row.productId, originalQuery: row.originalQuery ?? row.name,
    keywords: row.keywords, createdAt: row.createdAt.toISOString() };
}
