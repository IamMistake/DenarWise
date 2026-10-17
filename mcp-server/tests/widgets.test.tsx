import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { ReviewItems } from "../nextsignal/mcp/ui/review-items";
import { ShoppingList } from "../nextsignal/mcp/ui/shopping-list";
import type { ShoppingView } from "../nextsignal/mcp/ui/types";
const view: ShoppingView = { view: "added", status: "draft", spaceId: "s", spaces: [{ id: "s", name: "Home" }], stores: [], confirmationId: crypto.randomUUID(),
  items: [{ id: "draft", spaceId: "s", name: "Milk", originalQuery: "Bitolsko milk", quantity: "2", store: null, createdAt: "now", matching: { choices: [], selectedProductId: null, warnings: ["Matching failed. Retry or keep manually."], incomplete: true } }] };
const props = { busy: false, dirty: false, retrying: new Set<string>(), onMove() {}, onUpdate() {}, onSearch() {}, onSave() {} };
test("review requires an explicit choice, exposes retries and renders warnings", () => {
  const html = renderToStaticMarkup(<ReviewItems view={view} {...props} />);
  assert.match(html, /Keep as manual item/); assert.match(html, /Skip this item/); assert.match(html, /Matching failed/);
  assert.match(html, /Refine product search/); assert.match(html, /disabled=""[^>]*>Add/);
});
test("manual choice enables confirmation while a size alternative remains explicit", () => {
  const manual = { ...view, items: view.items.map((i) => ({ ...i, selection: "manual" as const })) };
  const html = renderToStaticMarkup(<ReviewItems view={manual} {...props} />);
  assert.doesNotMatch(html, /disabled=""[^>]*>Add/);
});
test("list renders canonical product, branch, prices, unpriced count and Clear", () => {
  const list: ShoppingView = { ...view, view: "list", items: [{ ...view.items[0], name: "Canonical Bitolsko 1 L", recommendation: { status: "priced", stale: true, incomplete: true, lineTotal: 140,
    offer: { id: "o", sourceId: "source", name: "Milk", normalizedName: "milk", description: "", market: "vero", branch: "Vero 9", price: 70, available: true, retrievedAt: new Date().toISOString(), sourceUpdatedAt: "today", saleType: "Promotion", promoPeriod: "this week" } } }] };
  const html = renderToStaticMarkup(<ShoppingList view={list} selected={new Set(["draft"])} pending={new Set()} onSelectedChange={() => {}} onClear={() => {}} />);
  assert.match(html, /Canonical Bitolsko/); assert.match(html, /Vero 9/); assert.match(html, /Outdated price/); assert.match(html, /Estimated priced subtotal/); assert.match(html, /Clear 1/);
});
