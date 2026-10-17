import { useEffect } from "react";
import { useShoppingModel, type ShoppingTransport } from "./shopping-model";
import { ShoppingPanel } from "./shopping-panel";
import { buildPreview } from "./preview-data";

const previewTransport: ShoppingTransport = async (name, args, current) => {
  if (name === "shopping_ui_clear_items") {
    const ids = new Set(args.ids as string[]);
    return { ...current, view: "list", items: current.items.filter((item) => !ids.has(item.id)) };
  }
  if (name === "shopping_ui_search_products") {
    return { matching: current.items.find((item) => item.id === args.itemId)?.matching };
  }
  return { ...current, status: "saved", items: current.items.filter((item) => item.selection !== "skip") };
};
export function PreviewApp({ state }: { state: string }) {
  const model = useShoppingModel(previewTransport);
  const { apply, setActionError } = model;
  useEffect(() => {
    const preview = buildPreview(state);
    if (preview.view) apply(preview.view);
    if (preview.error) setActionError(preview.error);
  }, [state, apply, setActionError]);
  return <ShoppingPanel model={model} connected pendingNames={buildPreview(state).names} mock />;
}
