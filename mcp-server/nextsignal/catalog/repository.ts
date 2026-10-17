import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { catalogCache, catalogOffers, catalogProducts } from "@/nextsignal/db/catalog";
import { getDb } from "@/nextsignal/services/database";
import { stage } from "@/nextsignal/observability/context";
import { hash } from "./normalize";
import { MATCHING_VERSION } from "./policy";
import type { CatalogOffer, CatalogProduct, MappingEvidence } from "./types";

export function createCatalogRepository(database = getDb) { return {
  async cachedMany<T>(namespace: string, keys: string[]): Promise<Map<string, T>> {
    if (!keys.length) return new Map();
    return stage("catalog.cache.read_many", { namespace, count: keys.length }, async () => {
      const db = await database();
      const ids = new Map(keys.map((key) => [hash(`${MATCHING_VERSION}:${namespace}:${key}`), key]));
      const rows = await db.select().from(catalogCache).where(and(inArray(catalogCache.key, [...ids.keys()]), gt(catalogCache.expiresAt, new Date())));
      return new Map(rows.map((row) => [ids.get(row.key)!, row.data as T]));
    });
  },
  async cacheMany(namespace: string, entries: Array<{ key: string; data: unknown }>, ttlMs: number) {
    if (!entries.length) return;
    return stage("catalog.cache.write_many", { namespace, count: entries.length }, async () => {
      const db = await database();
      const values = entries.map(({ key, data }) => ({ key: hash(`${MATCHING_VERSION}:${namespace}:${key}`), data, expiresAt: new Date(Date.now() + ttlMs) }));
      await db.insert(catalogCache).values(values).onConflictDoUpdate({ target: catalogCache.key, set: { data: sql`excluded.data`, expiresAt: sql`excluded.expires_at` } });
    });
  },
  async cached<T>(namespace: string, key: string): Promise<T | undefined> {
    return stage("catalog.cache.read", { namespace }, async () => {
      const db = await database();
      const [row] = await db.select().from(catalogCache).where(and(eq(catalogCache.key, hash(`${MATCHING_VERSION}:${namespace}:${key}`)), gt(catalogCache.expiresAt, new Date())));
      return row?.data as T | undefined;
    });
  },
  async cache(namespace: string, key: string, data: unknown, ttlMs: number) {
    return stage("catalog.cache.write", { namespace }, async () => {
      const db = await database();
      const values = { key: hash(`${MATCHING_VERSION}:${namespace}:${key}`), data, expiresAt: new Date(Date.now() + ttlMs) };
      await db.insert(catalogCache).values(values).onConflictDoUpdate({ target: catalogCache.key, set: values });
    });
  },
  async product(id: string) {
    return stage("catalog.product.read", { productId: id }, async () => {
      const db = await database();
      const [row] = await db.select().from(catalogProducts).where(eq(catalogProducts.id, id));
      return row ? { ...row, incomplete: row.incomplete === "true" } : null;
    });
  },
  async offers(productId: string): Promise<CatalogOffer[]> {
    return stage("catalog.offers.read", { productId }, async () => {
      const db = await database();
      return (await db.select().from(catalogOffers).where(eq(catalogOffers.productId, productId))).map((row) => row.offer);
    });
  },
  async mappedProducts(offerIds: string[]) {
    if (!offerIds.length) return new Map<string, string>();
    return stage("catalog.mappings.read", { count: offerIds.length }, async () => {
      const db = await database();
      const rows = await db.select({ id: catalogOffers.id, productId: catalogOffers.productId }).from(catalogOffers).where(inArray(catalogOffers.id, offerIds));
      return new Map(rows.map((row) => [row.id, row.productId]));
    });
  },
  async save(product: CatalogProduct, offers: CatalogOffer[], incomplete: boolean, evidence: Record<string, MappingEvidence> = {}) {
    return stage("catalog.product.save", { productId: product.id, offerCount: offers.length }, async () => {
      const db = await database();
      await db.transaction(async (tx) => {
        // Product identity is immutable once a user can select it.
        await tx.insert(catalogProducts).values({ id: product.id, product, incomplete: String(incomplete) }).onConflictDoNothing();
        const unique = [...new Map(offers.map((offer) => [offer.id, offer])).values()];
        if (unique.length) await tx.insert(catalogOffers).values(unique.map((offer) => ({ id: offer.id, productId: product.id, offer, evidence: evidence[offer.id] ?? null, retrievedAt: new Date(offer.retrievedAt) })))
          .onConflictDoUpdate({ target: catalogOffers.id, set: { offer: sql`excluded.offer`, evidence: sql`coalesce(${catalogOffers.evidence}, excluded.evidence)`, retrievedAt: sql`excluded.retrieved_at` }, setWhere: eq(catalogOffers.productId, product.id) });
      });
    });
  },
  async markRefreshed(id: string, incomplete: boolean) {
    return stage("catalog.refresh.record", { productId: id, incomplete }, async () => {
      const db = await database();
      await db.update(catalogProducts).set({ refreshedAt: new Date(), incomplete: String(incomplete) }).where(eq(catalogProducts.id, id));
    });
  }
}; }
export const catalogRepository = createCatalogRepository();
export type CatalogRepository = typeof catalogRepository;
