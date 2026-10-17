import { apiProcess, forwardFault, requireUser, validateWith, value, type ProcessContext } from "@gotch/nextsignal";
import { requireSpace } from "@/nextsignal/processes/business/context";
import type { AppServices } from "@/nextsignal/services";
import { shoppingSearchProductsInputSchema, type ShoppingSearchProductsInput } from "@/nextsignal/schemas";
import type { MatchResult } from "@/nextsignal/catalog/types";
export const shoppingSearchProductsApi = apiProcess<ShoppingSearchProductsInput, { itemId: string; matching: MatchResult }, AppServices>({
  name: "shopping.searchProducts",
  auth: requireUser(), validate: validateWith(shoppingSearchProductsInputSchema), handle: searchHandle
});
async function searchHandle(ctx: ProcessContext<AppServices>, input: ShoppingSearchProductsInput) {
  const space = await requireSpace(ctx, input.spaceId);
  if (!space.ok) return forwardFault(space);
  const [matching] = await ctx.services.matching.match([{ query: input.query, keywords: input.keywords ?? [], quantity: 1, store: input.store }]);
  return value({ itemId: input.itemId, matching });
}
