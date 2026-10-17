import type { ShoppingView as ServerShoppingView } from "@/nextsignal/domain/shopping-view";
import type { ShoppingItem } from "@/nextsignal/domain/home";
export type ShoppingUiItem = ShoppingItem & { selection?: "manual" | "skip" };
export type ShoppingView = Omit<ServerShoppingView, "items"> & { items: ShoppingUiItem[] };
export function parseShoppingView(value: unknown): ShoppingView | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<ShoppingView>;
  if ((v.view !== "added" && v.view !== "list") || typeof v.spaceId !== "string") return null;
  if (!Array.isArray(v.items) || !Array.isArray(v.spaces) || !Array.isArray(v.stores)) return null;
  if (v.view === "added" && v.status !== "draft" && v.status !== "saved") return null;
  return v as ShoppingView;
}
export function editableSnapshot(view: ShoppingView) {
  return JSON.stringify({ spaceId: view.spaceId, items: view.items.map((i) => ({ id: i.id, quantity: i.quantity, store: i.requestedStore ?? null, productId: i.productId ?? null })) });
}
