import type { ShoppingView } from "@/nextsignal/domain/shopping-view";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { dispatchMcpTool } from "@/nextsignal/mcp/tools/context";
import { toMcpToolResult } from "@/nextsignal/mcp/result";
import type { NextSignalMcpTool, NextSignalMcpToolContext } from "@/nextsignal/mcp/types";
import { SHOPPING_APP_URI } from "@/nextsignal/mcp/ui/shopping-resource";
import type { ShoppingAddItemOutput } from "@/nextsignal/processes/business/shopping/add-item";
import type { ShoppingClearItemsOutput } from "@/nextsignal/processes/business/shopping/clear-items";
import type { ShoppingUpdateItemsOutput } from "@/nextsignal/processes/business/shopping/update-items";
import type { ShoppingPreviewAddOutput } from "@/nextsignal/processes/api/shopping/preview-add";
import type { ShoppingItem } from "@/nextsignal/domain/home";
import type { SpaceSummary } from "@/nextsignal/services/spaces";
import type {
  ShoppingAddItemInput,
  ShoppingClearItemsInput,
  ShoppingListItemsInput,
  ShoppingUpdateItemsInput,
  SpacesListInput
} from "@/nextsignal/schemas";

type ToolExtra = Parameters<typeof dispatchMcpTool>[3];


export async function listShoppingItems(
  { app }: NextSignalMcpToolContext,
  input: ShoppingListItemsInput,
  extra: ToolExtra
): Promise<CallToolResult> {
  const result = await dispatchMcpTool<ShoppingListItemsInput>(app, "shopping.listItems", input, extra);
  if (!result.ok) return toMcpToolResult(result);

  const spaces = await listSpaces(app, extra);
  if (!spaces.ok) return spaces.error;

  const items = (result.data ?? []) as ShoppingItem[];
  return shoppingViewResult({
    view: "list",
    spaceId: input.spaceId,
    spaces: spaces.value,
    items,
    stores: distinctStores(items)
  });
}

export async function previewShoppingItems(
  { app }: NextSignalMcpToolContext,
  input: ShoppingAddItemInput,
  extra: ToolExtra
): Promise<CallToolResult> {
  const result = await dispatchMcpTool<ShoppingAddItemInput>(app, "shopping.previewAdd", input, extra);
  if (!result.ok) return toMcpToolResult(result);

  const spaces = await listSpaces(app, extra);
  if (!spaces.ok) return spaces.error;

  const data = result.data as ShoppingPreviewAddOutput;
  return shoppingViewResult({
    view: "added",
    status: "draft",
    spaceId: input.spaceId,
    spaces: spaces.value,
    items: data.proposedItems,
    confirmationId: data.confirmationId,
    stores: distinctStores(data.items)
  });
}

export async function addShoppingItemsFromUi(
  { app }: NextSignalMcpToolContext,
  input: ShoppingAddItemInput,
  extra: ToolExtra
): Promise<CallToolResult> {
  const spaces = await listSpaces(app, extra);
  if (!spaces.ok) return spaces.error;

  const result = await dispatchMcpTool<ShoppingAddItemInput>(app, "shopping.addItem", input, extra);
  if (!result.ok) return toMcpToolResult(result);

  const data = result.data as ShoppingAddItemOutput;
  return shoppingViewResult({
    view: "added",
    status: "saved",
    spaceId: input.spaceId,
    spaces: spaces.value,
    items: data.addedItems,
    stores: distinctStores(data.items)
  });
}

export async function updateShoppingItems(
  { app }: NextSignalMcpToolContext,
  input: ShoppingUpdateItemsInput,
  extra: ToolExtra
): Promise<CallToolResult> {
  const spaces = await listSpaces(app, extra);
  if (!spaces.ok) return spaces.error;

  const result = await dispatchMcpTool<ShoppingUpdateItemsInput>(app, "shopping.updateItems", input, extra);
  if (!result.ok) return toMcpToolResult(result);

  const data = result.data as ShoppingUpdateItemsOutput;
  return shoppingViewResult({
    view: "added",
    status: "saved",
    spaceId: data.spaceId,
    spaces: spaces.value,
    items: data.items,
    stores: distinctStores(data.items)
  });
}

export async function clearShoppingItemsFromUi(
  { app }: NextSignalMcpToolContext,
  input: { spaceId: string; ids: string[] },
  extra: ToolExtra
): Promise<CallToolResult> {
  const spaces = await listSpaces(app, extra);
  if (!spaces.ok) return spaces.error;

  const result = await dispatchMcpTool<ShoppingClearItemsInput>(app, "shopping.clearItems", input, extra);
  if (!result.ok) return toMcpToolResult(result);

  const data = result.data as ShoppingClearItemsOutput;
  return shoppingViewResult({
    view: "list",
    spaceId: input.spaceId,
    spaces: spaces.value,
    items: data.items,
    stores: distinctStores(data.items)
  });
}

async function listSpaces(
  app: NextSignalMcpToolContext["app"],
  extra: ToolExtra
): Promise<
  | { ok: true; value: Array<{ id: string; name: string }> }
  | { ok: false; error: CallToolResult }
> {
  const result = await dispatchMcpTool<SpacesListInput>(app, "spaces.list", {}, extra);
  if (!result.ok) return { ok: false, error: toMcpToolResult(result) };

  return {
    ok: true,
    value: ((result.data ?? []) as SpaceSummary[]).map((space) => ({
      id: space.id,
      name: space.name
    }))
  };
}

function shoppingViewResult(view: ShoppingView): CallToolResult {
  const spaceName = view.spaces.find((space) => space.id === view.spaceId)?.name ?? "space";
  const message = view.view === "added" && view.status === "draft"
    ? `Prepared ${view.items.length} proposed shopping item${view.items.length === 1 ? "" : "s"} for ${spaceName}. Nothing has been added yet; review the widget and click Add to confirm.`
    : `${view.view === "added" ? "Saved" : "Found"} ${view.items.length} shopping item${view.items.length === 1 ? "" : "s"} in ${spaceName}.`;

  return {
    structuredContent: view,
    content: [
      {
        type: "text",
        text: `${message}\n${view.items.map((item) => `${item.name} × ${item.quantity}${item.recommendation?.offer ? `, ${item.recommendation.offer.market}: ${item.recommendation.offer.price} MKD` : ""}`).join("\n")}`
      }
    ]
  };
}

function distinctStores(items: ShoppingItem[]) {
  return [...new Set(items
    .map((item) => item.store?.trim())
    .filter((store): store is string => Boolean(store)))]
    .sort((left, right) => left.localeCompare(right));
}
