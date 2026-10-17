import { test } from "node:test";
import assert from "node:assert/strict";
import { normalize, parseAttributes, conflicts, normalizeMarket } from "../nextsignal/catalog/normalize";
import { recommend } from "../nextsignal/catalog/recommend";
import { shortlist, explain } from "../nextsignal/catalog/candidates";
import { shoppingAddItemInputSchema, shoppingUpdateItemsInputSchema } from "../nextsignal/schemas";
import { offer } from "./helpers";

test("normalizes Macedonian scripts, decimals and units", () => {
  assert.equal(normalize("БИТОЛСКО МЛЕКО 3,2%"), normalize("Bitolsko mleko 3.2%"));
  assert.equal(parseAttributes("млеко 1л").size, parseAttributes("mleko 1000 ml").size);
  assert.equal(parseAttributes("леб 0,5кг").size, 500);
  assert.equal(parseAttributes("млеко 3,2%").fatPercent, 3.2);
  assert.equal(normalizeMarket("Рептил"), "repti");
});
for (const [a, b] of [["млеко 1л", "млеко 500мл"], ["млеко 1л", "млеко 4*1л"], ["млеко УХТ 3.2% 1л", "млеко +Д3 3.2% 1л"], ["млеко 2.8%", "млеко 3.2%"], ["млеко без лактоза 1л", "млеко УХТ 1л"]]) {
  test(`rejects contradictory identity: ${a} / ${b}`, () => assert.ok(conflicts(parseAttributes(a), parseAttributes(b))));
}
test("shortlist rejects wafers and preserves all same-name store offers", () => {
  const request = { query: "mleko bitolsko 3.2%", keywords: [], quantity: 1 };
  const result = shortlist(request, [offer(), offer(undefined, "vero"), offer("Swisslion вафла млеко и какао 20g")]);
  assert.equal(result.length, 1); assert.equal(result[0].offers.length, 2);
});
test("unverified blue packaging prevents exact selection", () => {
  const request = { query: "Mleko bitolsko 3.2% plavo", keywords: [], quantity: 1 };
  assert.ok(explain(request, shortlist(request, [offer()])[0]).some((s) => s.includes("colour")));
});
test("recommendation honors strict market, ignores unavailable and zero prices", () => {
  const offers = [offer(undefined, "kam", 75), offer(undefined, "vero", 70), { ...offer(undefined, "zito", 1), available: false }, offer(undefined, "dim", 0)];
  assert.equal(recommend(offers, "2", null, false).lineTotal, 140);
  assert.equal(recommend(offers, "2", "КАМ", false).offer?.market, "kam");
  assert.equal(recommend(offers, "2", "ramstore", false).status, "unavailable");
  assert.equal(recommend(offers, "2 kg", null, false).lineTotal, null);
});
test("fresh offers take precedence over obsolete bargains", () => {
  const old = { ...offer(undefined, "kam", 1), retrievedAt: new Date(Date.now() - 3600000).toISOString() };
  assert.equal(recommend([old, offer(undefined, "vero", 70)], "1", null, true).offer?.market, "vero");
  assert.equal(recommend([old], "1", null, false).stale, true);
});
test("accepts new and legacy tool inputs and rejects invalid package counts", () => {
  assert.ok(shoppingAddItemInputSchema.safeParse({ spaceId: "space", query: "milk", keywords: ["milk"], quantity: 2 }).success);
  assert.ok(shoppingAddItemInputSchema.safeParse({ spaceId: "space", name: "milk", quantity: "2" }).success);
  for (const quantity of [0, -1, 1.5, "2 kg", "0", "Infinity"]) assert.equal(shoppingAddItemInputSchema.safeParse({ spaceId: "space", query: "milk", quantity }).success, false);
  assert.equal(shoppingAddItemInputSchema.safeParse({ spaceId: "space", items: Array(21).fill({ query: "milk" }) }).success, false);
  assert.equal(shoppingUpdateItemsInputSchema.safeParse({ spaceId: "space", itemIds: ["a"], updates: [{ id: "b", quantity: 2 }] }).success, false);
});

test("query variant requirements allow a compound variant without weakening identity comparison", () => {
  const query = { query: "mleko bez laktoza 1l", keywords: [], quantity: 1 };
  assert.equal(shortlist(query, [offer("Млеко УХТ без лактоза 1л")]).length, 1);
  assert.ok(conflicts(parseAttributes("Млеко УХТ без лактоза 1л"), parseAttributes("Млеко УХТ 1л")));
});
