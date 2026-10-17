import { test } from "node:test";
import assert from "node:assert/strict";
import { encodeCache, decodeCache } from "../nextsignal/catalog/cache-codec";
import { createCatalogRepository } from "../nextsignal/catalog/repository";
import { quiet } from "./helpers";

test("large source caches are compact and round-trip without changing product data", () => {
  const value = { offers: Array.from({ length: 600 }, (_, index) => ({ id: index, name: "Битолско млеко 3.2% 1л", price: 75, market: "kam", branch: `Branch ${index}` })) };
  const encoded = encodeCache(value);
  assert.ok(JSON.stringify(encoded).length < JSON.stringify(value).length / 3);
  assert.deepEqual(decodeCache(encoded), value);
  assert.deepEqual(decodeCache({ manual: "old cache" }), { manual: "old cache" });
});
test("a temporary cache database failure becomes a miss instead of losing matching results", () => quiet(async () => {
  const repository = createCatalogRepository(async () => { throw new Error("temporary database disconnect"); });
  assert.equal(await repository.cached("matches", "q"), undefined);
  assert.deepEqual(await repository.cachedMany("search", ["milk"]), new Map());
  await repository.cache("matches", "q", { value: 1 }, 1000);
  await repository.cacheMany("search", [{ key: "milk", data: { offers: [] } }], 1000);
  await assert.rejects(() => repository.product("must-still-fail"), /temporary database/);
}));
