import { apiProcess, forwardFault, requireUser, validateWith, value, type ProcessContext } from "@gotch/nextsignal";
import { requireSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { shoppingAddItemInputSchema, type ShoppingAddItemInput } from "@/nextsignal/schemas";
import type { ShoppingItem } from "@/nextsignal/domain/home";
import { keywordsFor } from "@/nextsignal/catalog/normalize";

export type ShoppingPreviewAddOutput = { proposedItems: ShoppingItem[]; items: ShoppingItem[]; confirmationId: string };
export const shoppingPreviewAddApi = apiProcess<ShoppingAddItemInput, ShoppingPreviewAddOutput, AppServices>({
  name: "shopping.previewAdd",
  metadata: { description: "Matches requested products for review without adding shopping items.", tags: ["shopping", "api", "ui"], owner: "home", version: "0.2.0" },
  auth: requireUser(), validate: validateWith(shoppingAddItemInputSchema), handle: previewHandle
});
async function previewHandle(ctx: ProcessContext<AppServices>, input: ShoppingAddItemInput) {
  const space = await requireSpace(ctx, input.spaceId);
  if (!space.ok) return forwardFault(space);
  const requested = (input.items?.length ? input.items : [input]).map((item) => ({
    query: (item.query ?? item.name)!.trim(), quantity: Number(item.quantity ?? 1),
    keywords: keywordsFor((item.query ?? item.name)!, item.keywords), store: item.store
  }));
  const matches = await ctx.services.matching.match(requested);
  const createdAt = new Date().toISOString();
  const proposedItems: ShoppingItem[] = requested.map((item, index) => ({
    id: `draft-${crypto.randomUUID()}`, spaceId: input.spaceId, name: item.query, originalQuery: item.query,
    keywords: item.keywords, quantity: String(item.quantity), store: item.store ?? null, requestedStore: item.store ?? null,
    productId: matches[index].selectedProductId, matching: matches[index], createdAt
  }));
  return value({ proposedItems, items: await ctx.services.shopping.storedItems(input.spaceId), confirmationId: crypto.randomUUID() });
}
