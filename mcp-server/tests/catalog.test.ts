import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "../nextsignal/db/schema";
import { createCatalogRepository } from "../nextsignal/catalog/repository";
import { createShoppingService } from "../nextsignal/services/shopping";
import { createMatching } from "../nextsignal/catalog/matching";
import { createRecommendations } from "../nextsignal/catalog/recommendations";
import type { getDb } from "../nextsignal/services/database";
import type { GatewayClient } from "../nextsignal/integrations/ai-gateway/client";
import type { CatalogProduct, MatchRequest, SearchResult } from "../nextsignal/catalog/types";
import { parseAttributes } from "../nextsignal/catalog/normalize";
import { quiet, offer } from "./helpers";

const pg = new PGlite();
const db = drizzle(pg, { schema });
const database = async () => db as unknown as Awaited<ReturnType<typeof getDb>>;
const repository = createCatalogRepository(database);
const request: MatchRequest = { query: "mleko bitolsko 3.2% 1l", keywords: ["mleko", "bitolsko"], quantity: 2 };
const selected: CatalogProduct = { id: "selected-milk", name: "Битолско УХТ 3.2% 1л", anchorName: offer().name, attributes: parseAttributes(offer().name), keywords: request.keywords };
before(async () => {
  const journal = JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
  for (const entry of journal.entries) await pg.exec(await readFile(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url), "utf8"));
  // PGlite runs one session and doesn't implement PostgreSQL advisory locks.
  await pg.exec("CREATE OR REPLACE FUNCTION pg_advisory_xact_lock(bigint) RETURNS void LANGUAGE SQL AS 'SELECT';");
});
after(async () => { await pg.close(); });
const retrieval = (result: SearchResult) => (_signal: AbortSignal) => async () => result;
const result = (offers: SearchResult["offers"]): SearchResult => ({ offers, incomplete: false, retrievedAt: new Date().toISOString() });
const gateway: GatewayClient = {
  async decisions(_state, questions) { return Object.fromEntries(Object.keys(questions).map((key) => [key, 0.99])); },
  async extract(records) { return records.map((r) => ({ ...r, canonicalName: r.name, brand: null, category: null, variant: null, evidence: [r.name], group: "milk" })); }
};

test("all migrations apply, and product caches expire", () => quiet(async () => {
  await repository.cache("test", "expired", { value: 1 }, -1);
  assert.equal(await repository.cached("test", "expired"), undefined);
  await repository.cache("test", "live", { value: 2 }, 1000);
  assert.deepEqual(await repository.cached("test", "live"), { value: 2 });
}));
test("canonical products and source mappings persist independently from shopping rows", () => quiet(async () => {
  await repository.save(selected, [offer(), offer(undefined, "vero", 70)], false);
  const changed = { ...selected, name: "Should never overwrite selected identity" };
  await repository.save(changed, [], true);
  assert.equal((await repository.product(selected.id))?.product.name, selected.name);
  assert.equal((await repository.offers(selected.id)).length, 2);
}));
test("matching groups store offers and rejects a same-brand D3 variant even when the model says yes", () => quiet(async () => {
  const q = { ...request, query: "bitolsko mleko 3.2% 1l UHT" };
  const matching = createMatching(repository, gateway, retrieval(result([offer(undefined, "store-a"), offer(undefined, "store-b"), offer("Битолско млеко +Д3 3.2% 1л", "store-c")])));
  const [matched] = await matching.match([q]);
  assert.equal(matched.choices.length, 1); assert.equal(matched.choices[0].marketCount, 2);
  assert.ok(matched.selectedProductId);
}));
test("size alternatives and unverified packaging are never preselected", () => quiet(async () => {
  const breadRequest = { query: "Zhito luks proteinski leb 500g", keywords: ["proteinski", "leb"], quantity: 1 };
  const matching = createMatching(repository, gateway, retrieval(result([offer("Жито Лукс протеински леб 400гр", "bread-store")])));
  const [matched] = await matching.match([breadRequest]);
  assert.equal(matched.selectedProductId, null); assert.equal(matched.choices[0].kind, "alternative");
  assert.ok(matched.choices[0].warnings.some((w) => w.includes("500")));
  const colourMatching = createMatching(repository, gateway, retrieval(result([offer(undefined, "colour-store")])));
  const [colour] = await colourMatching.match([{ ...request, query: `${request.query} plavo` }]);
  assert.equal(colour.selectedProductId, null); assert.equal(colour.choices[0].kind, "possible");
}));
test("one failed item preserves other rows and a cached batch avoids model calls", () => quiet(async () => {
  let calls = 0;
  const instrumented: GatewayClient = { ...gateway, async decisions(state, questions, signal) { calls++; return gateway.decisions(state, questions, signal); } };
  const retrieve = (_signal: AbortSignal) => async (query: string) => { if (query === "failing") throw new Error("upstream failure"); return result([offer("Млеко Битолско УХТ 3.2% 500мл", "partial-store")]); };
  const matching = createMatching(repository, instrumented, retrieve);
  const queries = [{ ...request, query: "failing" }, { ...request, query: "bitolsko mleko 3.2% 500ml" }];
  const matched = await matching.match(queries);
  assert.equal(matched[0].choices.length, 0); assert.equal(matched[1].choices.length, 1);
  const before = calls; await matching.match([queries[1]]); assert.equal(calls, before);
}));
test("refresh changes recommended store without changing the selected product", () => quiet(async () => {
  const product = { ...selected, id: "refresh-milk" };
  const old = { ...offer(undefined, "old-store", 1), retrievedAt: new Date(Date.now() - 3600000).toISOString() };
  await repository.save(product, [old], false);
  const fresh = offer(undefined, "new-store", 60);
  const recommendations = createRecommendations(repository, gateway, retrieval(result([fresh])));
  const [item] = await recommendations.enrich([{ id: "item", spaceId: "s", name: product.name, productId: product.id, quantity: "2", store: null, requestedStore: null, createdAt: new Date().toISOString() }]);
  assert.equal(item.productId, product.id); assert.equal(item.store, "new-store"); assert.equal(item.recommendation?.lineTotal, 120);
}));
test("refresh failure keeps a visibly stale snapshot and never relaxes a market restriction", () => quiet(async () => {
  const product = { ...selected, id: "stale-milk" };
  await repository.save(product, [offer(undefined, "only-market", 70)], false);
  const recommendations = createRecommendations(repository, gateway, (_signal) => async () => { throw new Error("offline"); });
  const base = { id: "old", spaceId: "s", name: product.name, productId: product.id, quantity: "2", store: null, requestedStore: null, createdAt: new Date().toISOString() };
  const [old, restricted] = await recommendations.enrich([base, { ...base, id: "restricted", store: "kam", requestedStore: "kam" }]);
  assert.equal(old.recommendation?.stale, true); assert.equal(old.recommendation?.offer?.price, 70);
  assert.equal(restricted.recommendation?.status, "unavailable");
}));
test("confirmation is idempotent and rejects changed payloads; canonical names are authoritative", () => quiet(async () => {
  const shopping = createShoppingService(database, repository, { async enrich(items) { return items; } });
  const items = await shopping.resolveItems({ spaceId: "s", items: [{ query: "My original request", name: "FORGED NAME", productId: selected.id, quantity: 2 }] });
  assert.equal(items![0].name, selected.name);
  assert.equal(await shopping.resolveItems({ spaceId: "s", query: "milk", productId: "missing" }), null);
  const input = { spaceId: "s", userId: "u", confirmationId: crypto.randomUUID(), items: items! };
  const first = await shopping.addItems(input); const second = await shopping.addItems(input);
  assert.equal(first?.replayed, false); assert.equal(second?.replayed, true);
  assert.equal(second?.addedItems[0].id, first?.addedItems[0].id);
  assert.equal(await shopping.addItems({ ...input, items: [{ ...items![0], quantity: "3" }] }), null);
}));
test("store-based clearing uses recommendations, and space-scoped mutations preserve catalog data", () => quiet(async () => {
  const shopping = createShoppingService(database, repository, { async enrich(items) { return items.map((item) => ({ ...item, store: "vero" })); } });
  const items = await shopping.resolveItems({ spaceId: "clear-space", items: [{ query: "milk", productId: selected.id, quantity: 1 }] });
  const saved = await shopping.addItems({ spaceId: "clear-space", userId: "u", confirmationId: crypto.randomUUID(), items: items! });
  const id = saved!.addedItems[0].id;
  assert.equal(await shopping.updateItems({ spaceId: "wrong-space", itemIds: [id], updates: [{ id, quantity: 3 }] }), null);
  assert.equal((await shopping.clearItems({ spaceId: "clear-space", store: "kam", all: true })).length, 0);
  assert.equal((await shopping.clearItems({ spaceId: "clear-space", store: "vero", all: true })).length, 1);
  assert.ok(await repository.product(selected.id));
}));

test("shared keyword searches run only once per batch, with partial-failure coverage", () => quiet(async () => {
  const { createRetrieval } = await import("../nextsignal/catalog/retrieval");
  const terms: string[] = [];
  const retrieve = createRetrieval(repository, { async search(term) { terms.push(term); if (term === "dedupeBrand") throw new Error("failed keyword"); return result([offer(undefined, "shared-search")]); } })(AbortSignal.timeout(1000));
  const [a, b] = await Promise.all([retrieve("one", ["dedupeMilk", "dedupeBrand"]), retrieve("two", ["dedupeMilk", "dedupeBrand"])]);
  assert.equal(terms.length, 3); assert.equal(a.offers.length, 1); assert.equal(a.incomplete, true); assert.deepEqual(a, b);
}));

test("equal parsed attributes do not merge an unverified special edition", () => quiet(async () => {
  const cautious: GatewayClient = { ...gateway, async decisions(_state, questions) { return Object.fromEntries(Object.keys(questions).map((key) => [key, key.startsWith("exact_") || key.startsWith("related_") ? 0.99 : 0])); } };
  const first = offer("Млеко Битолско УХТ 3.2% 1л оригинал", "edition-a");
  const second = offer("Млеко Битолско УХТ 3.2% 1л специјал", "edition-b");
  const matching = createMatching(repository, cautious, retrieval(result([first, second])));
  const [matched] = await matching.match([{ ...request, query: "bitolsko UHT milk 1l" }]);
  assert.equal(matched.choices.length, 2); assert.equal(matched.selectedProductId, null);
  assert.notEqual(matched.choices[0].product.id, matched.choices[1].product.id);
}));

test("an exact product and an ambiguous second product require explicit selection", () => quiet(async () => {
  const cautious: GatewayClient = { ...gateway, async decisions(_state, questions) {
    return Object.fromEntries(Object.keys(questions).map((key) => [key, key.startsWith("exact_") ? 0.99 : key.startsWith("related_") ? 0.9 : 0]));
  } };
  const matching = createMatching(repository, cautious, retrieval(result([
    offer("Битолско УХТ млеко 3.2% 1л", "unambiguous-store"),
    offer("Битолско УХТ млеко 1л", "ambiguous-store")
  ])));
  const [matched] = await matching.match([{ ...request, query: "bitolsko mleko UHT 3.2% 1l" }]);
  assert.equal(matched.choices.length, 2);
  assert.equal(matched.selectedProductId, null);
}));

test("offer identity evidence and matching version persist independently of decision caches", () => quiet(async () => {
  const offers = [offer("Млеко Битолско УХТ 3.2% 1 л", "evidence-a"), offer("Битолско млеко УХТ 3.2% 1л", "evidence-b")];
  const matching = createMatching(repository, gateway, retrieval(result(offers)));
  const [matched] = await matching.match([{ ...request, query: "bitolsko mleko uht 3.2% 1l evidence" }]);
  assert.equal(matched.choices.length, 1);
  const rows = (await db.select().from(schema.catalogOffers)).filter((row) => offers.some((offer) => offer.id === row.id));
  assert.equal(rows.length, 2);
  assert.ok(rows.every((row) => row.evidence?.matchingVersion && row.evidence.relevance?.query.includes("evidence")));
  assert.ok(rows.some((row) => row.evidence?.method === "jev" && row.evidence.probability === 0.99));
  const initial = rows.find((row) => row.id === offers[0].id)!.evidence;
  await db.delete(schema.catalogCache);
  await repository.save(matched.choices[0].product, [offers[0]], false);
  const afterRefresh = (await db.select().from(schema.catalogOffers)).find((row) => row.id === offers[0].id);
  assert.deepEqual(afterRefresh?.evidence, initial);
}));

test("Qwen failure preserves relevant products as persisted explicit choices", () => quiet(async () => {
  const broken: GatewayClient = { ...gateway, async extract() { throw new Error("invalid structured output"); } };
  const matching = createMatching(repository, broken, retrieval(result([offer("Млеко Новамлека 3.2% 1л", "qwen-failure")])));
  const [matched] = await matching.match([{ query: "novamleka mleko 3.2%", keywords: ["novamleka"], quantity: 1 }]);
  assert.equal(matched.choices.length, 1); assert.equal(matched.selectedProductId, null);
  assert.ok(matched.warnings.some((warning) => warning.includes("optional")));
  assert.ok(await repository.product(matched.choices[0].product.id));
}));
test("identity timeout preserves separate relevant products without unchecked merging", () => quiet(async () => {
  const broken: GatewayClient = { ...gateway, async decisions(state, questions, signal) {
    if ("pairs" in state) throw new DOMException("Identity timed out", "TimeoutError");
    return gateway.decisions(state, questions, signal);
  } };
  const matching = createMatching(repository, broken, retrieval(result([
    offer("Млеко Битолско УХТ 3.2% 750мл", "identity-timeout-a"),
    offer("Битолско млеко УХТ 3.2% 750 мл", "identity-timeout-b")
  ])));
  const [matched] = await matching.match([{ ...request, query: "bitolsko mleko 3.2% 750ml identity-timeout" }]);
  assert.equal(matched.choices.length, 2); assert.equal(matched.selectedProductId, null);
  assert.notEqual(matched.choices[0].product.id, matched.choices[1].product.id);
  for (const choice of matched.choices) assert.ok(await repository.product(choice.product.id));
}));
test("known brand and category skip Qwen when omitted variants must remain unknown", () => quiet(async () => {
  let extractions = 0;
  const instrumented: GatewayClient = { ...gateway, async extract(records, signal) { extractions++; return gateway.extract(records, signal); } };
  const matching = createMatching(repository, instrumented, retrieval(result([offer("Битолско млеко 3.2% 650мл", "known-name")])));
  const [matched] = await matching.match([{ ...request, query: "bitolsko mleko 3.2% 650ml" }]);
  assert.equal(matched.choices.length, 1); assert.equal(extractions, 0);
  assert.equal(matched.choices[0].product.attributes.variant, null);
}));
test("bulk persistence refreshes snapshots while keeping canonical identities and source ownership", () => quiet(async () => {
  const product = { ...selected, id: "bulk-product" };
  const originalOffer = offer("Млеко Битолско УХТ 3.2% 1л", "bulk-original");
  await repository.save(product, [originalOffer], false);
  const other = { ...selected, id: "bulk-other" };
  await repository.saveMany([
    { product: { ...product, name: "Must not overwrite" }, offers: [offer(undefined, "bulk-new")], incomplete: false, evidence: {} },
    { product: other, offers: [originalOffer], incomplete: false, evidence: {} }
  ]);
  const saved = await repository.product(product.id);
  assert.equal(saved?.product.name, product.name); assert.ok(saved?.refreshedAt);
  assert.equal((await repository.mappedProducts([originalOffer.id])).get(originalOffer.id), product.id);
}));

test("a failed relevance batch preserves verified candidates from successful batches", () => quiet(async () => {
  let batches = 0;
  const partial: GatewayClient = { ...gateway, async decisions(state, questions, signal) {
    if ("candidates" in state && ++batches === 2) throw new Error("One relevance batch failed");
    return gateway.decisions(state, questions, signal);
  } };
  const matching = createMatching(repository, partial, retrieval(result(Array.from({ length: 45 }, (_, index) =>
    offer(`Битолско УХТ млеко 3.2% 1л серија ${index}`, `partial-relevance-${index}`)))));
  const [matched] = await matching.match([{ ...request, query: "bitolsko mleko 3.2% 1l partial-relevance" }]);
  assert.ok(matched.choices.length > 0); assert.equal(matched.selectedProductId, null);
  assert.ok(matched.warnings.some((warning) => warning.includes("Some candidates")));
}));
