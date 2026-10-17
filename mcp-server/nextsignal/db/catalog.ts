import { index, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { CatalogOffer, CatalogProduct, MappingEvidence } from "@/nextsignal/catalog/types";

export const catalogProducts = pgTable("catalog_products", {
  id: text("id").primaryKey(),
  product: jsonb("product").$type<CatalogProduct>().notNull(),
  refreshedAt: timestamp("refreshed_at", { withTimezone: true }),
  incomplete: text("incomplete").notNull().default("true")
});

export const catalogOffers = pgTable("catalog_offers", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull().references(() => catalogProducts.id),
  offer: jsonb("offer").$type<CatalogOffer>().notNull(),
  evidence: jsonb("evidence").$type<MappingEvidence>(),
  retrievedAt: timestamp("retrieved_at", { withTimezone: true }).notNull()
}, (table) => [index("catalog_offers_product_idx").on(table.productId)]);

export const catalogCache = pgTable("catalog_cache", {
  key: text("key").primaryKey(),
  data: jsonb("data").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull()
}, (table) => [index("catalog_cache_expiry_idx").on(table.expiresAt)]);

export const shoppingConfirmations = pgTable("shopping_confirmations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  requestId: text("request_id").notNull(),
  payloadHash: text("payload_hash").notNull(),
  itemIds: jsonb("item_ids").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => [uniqueIndex("shopping_confirmation_request_idx").on(table.userId, table.requestId)]);
