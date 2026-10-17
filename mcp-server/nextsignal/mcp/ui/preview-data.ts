// Development gallery fixtures. These prices never enter server persistence.
import { MARKETS, sampleMatches } from "../../domain/price-matching";
import type { ShoppingUiItem, ShoppingView } from "./types";
import type { ProductChoice } from "../../catalog/types";
const spaces = [{ id: "sample-space-1", name: "Filipovski" }, { id: "sample-space-2", name: "Dracevo" }];
const base = { spaceId: spaces[0].id, spaces, stores: [...MARKETS] };

function sampleItem(key: keyof typeof sampleMatches, quantity: string, choose = false): ShoppingUiItem {
  const sample = sampleMatches[key];
  const selectedId = choose ? sample.products[0]?.id ?? null : sample.selectedId;
  const choices: ProductChoice[] = sample.products.map((product) => ({
    product: { id: product.id, name: product.name, anchorName: product.name, keywords: sample.keywords,
      attributes: { brand: null, category: null, variant: null, size: null, unit: null, packCount: 1, fatPercent: null } },
    kind: "possible", probability: 0.8, warnings: ["Illustrative product and price data."],
    marketCount: product.prices.length, cheapestPrice: Math.min(...product.prices.map((p) => p.price))
  }));
  const product = sample.products.find((p) => p.id === selectedId);
  const price = product?.prices.filter((p) => !sample.pinnedStore || p.store === sample.pinnedStore).sort((a, b) => a.price - b.price)[0];
  return {
    id: `sample-${key}`, spaceId: base.spaceId, name: product?.name ?? sample.query, originalQuery: sample.query,
    keywords: sample.keywords, quantity, store: price?.store ?? null, requestedStore: sample.pinnedStore ?? null,
    productId: selectedId, createdAt: "2026-10-17T09:00:00.000Z",
    matching: { choices, selectedProductId: selectedId, warnings: ["Sample data"], incomplete: true },
    recommendation: price ? { status: "priced", lineTotal: price.price * Number(quantity), stale: false, incomplete: true,
      offer: { id: `sample-offer-${key}`, sourceId: "sample", name: product!.name, normalizedName: "sample", description: "",
        market: price.store, branch: "Sample branch", price: price.price, available: true, saleType: "", promoPeriod: "",
        sourceUpdatedAt: "", retrievedAt: "2026-10-17T09:00:00.000Z" } } : undefined
  };
}
export function buildPreview(state: string): { view: ShoppingView | null; names?: string[]; error?: string } {
  if (state === "matching") return { view: null, names: [sampleMatches.milk.query, sampleMatches.bread.query, sampleMatches.yogurt.query] };
  const items = [sampleItem("milk", "2"), sampleItem("bread", "1", state !== "compare"), sampleItem("yogurt", "1")];
  if (state === "compare") items.push(sampleItem("kefir", "1"));
  if (state === "list") items.push({ id: "sample-bananas", spaceId: base.spaceId, name: "Банани", quantity: "7", store: null, createdAt: "2026-10-17T09:00:00.000Z" });
  return { view: { ...base, view: state === "list" || state === "empty" ? "list" : "added",
    status: state === "saved" ? "saved" : "draft", confirmationId: "sample-confirmation", items: state === "empty" ? [] : items },
    ...(state === "error" ? { error: "Could not reach the server. Your items were not added. Try again." } : {}) };
}
