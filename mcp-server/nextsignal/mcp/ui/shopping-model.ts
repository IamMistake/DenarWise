import { useCallback, useState } from "react";
import type { MatchResult } from "@/nextsignal/catalog/types";
import { parseShoppingView, editableSnapshot, type ShoppingView } from "./types";
import type { ItemChange } from "./review-items";
export type ShoppingTransport = (name: string, args: Record<string, unknown>, current: ShoppingView) => Promise<unknown>;

export function useShoppingModel(callTool: ShoppingTransport) {
  const [view, setView] = useState<ShoppingView | null>(null);
  const [baseline, setBaseline] = useState<ShoppingView | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [retrying, setRetrying] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const apply = useCallback((next: ShoppingView) => {
    setView(next); setBaseline(next.status === "saved" ? next : null); setSelected(new Set()); setActionError(null);
  }, []);
  const call = useCallback(async (name: string, arguments_: Record<string, unknown>) => {
    if (!view) throw new Error("The shopping view is still loading.");
    const content = await callTool(name, arguments_, view);
    const next = parseShoppingView(content);
    if (next) apply(next);
    else if (name !== "shopping_ui_search_products") throw new Error("The server returned an invalid shopping view. Retry the action.");
    return content;
  }, [callTool, view, apply]);
  const update = (id: string, change: ItemChange) => { setActionError(null); setView((current) => current ? { ...current, items: current.items.map((i) => i.id === id ? { ...i, ...change } : i) } : current); };
  const search = async (id: string, query: string) => {
    if (!view) return;
    setRetrying((s) => new Set([...s, id])); setActionError(null);
    try {
      const item = view.items.find((i) => i.id === id)!;
      const result = await call("shopping_ui_search_products", { spaceId: view.spaceId, itemId: id, query, ...(item.requestedStore ? { store: item.requestedStore } : {}) }) as { matching: MatchResult };
      setView((current) => current ? { ...current, items: current.items.map((i) => i.id === id ? { ...i, originalQuery: query, keywords: [], matching: result.matching, productId: result.matching.selectedProductId, selection: undefined } : i) } : current);
    } catch (e) { setActionError(message(e)); }
    finally { setRetrying((s) => new Set([...s].filter((value) => value !== id))); }
  };
  const save = async () => {
    if (!view) return;
    setSaving(true); setActionError(null);
    try {
      if (view.status === "draft") {
        await call("shopping_ui_add_items", { spaceId: view.spaceId, confirmationId: view.confirmationId,
          items: view.items.filter((i) => i.selection !== "skip").map((i) => ({ query: i.originalQuery ?? i.name, keywords: i.keywords ?? [], quantity: Number(i.quantity), productId: i.productId ?? null, ...(i.requestedStore ? { store: i.requestedStore } : {}) })) });
      } else if (baseline) {
        const updates = view.items.flatMap((i) => {
          const before = baseline.items.find((b) => b.id === i.id);
          return before && editableSnapshot({ ...view, items: [i], spaceId: "" }) !== editableSnapshot({ ...baseline, items: [before], spaceId: "" }) ? [{ id: i.id,
            ...(before.quantity !== i.quantity ? { quantity: Number(i.quantity) } : {}),
            store: i.requestedStore ?? null, productId: i.productId ?? null }] : [];
        });
        await call("shopping_ui_update_items", { spaceId: baseline.spaceId, itemIds: baseline.items.map((i) => i.id), ...(view.spaceId !== baseline.spaceId ? { targetSpaceId: view.spaceId } : {}), ...(updates.length ? { updates } : {}) });
      }
    } catch (e) { setActionError(message(e)); }
    finally { setSaving(false); }
  };
  const clear = async () => {
    if (!view || !selected.size) return;
    setPending(new Set(selected)); setActionError(null);
    try { await call("shopping_ui_clear_items", { spaceId: view.spaceId, ids: [...selected] }); }
    catch (e) { setActionError(message(e)); }
    finally { setPending(new Set()); }
  };
  const dirty = view && baseline ? editableSnapshot(view) !== editableSnapshot(baseline) : false;
  return { view, apply, selected, setSelected, pending, retrying, saving, actionError, setActionError,
    update, search, save, clear, dirty,
    move: (spaceId: string) => setView((current) => current ? { ...current, spaceId, items: current.items.map((i) => ({ ...i, spaceId })) } : current) };
}
function message(error: unknown) { return error instanceof Error ? error.message : "The operation failed."; }
export type ShoppingModel = ReturnType<typeof useShoppingModel>;
