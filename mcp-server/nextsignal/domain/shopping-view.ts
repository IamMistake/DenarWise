import type { ShoppingItem } from "./home";

export type ShoppingView = {
  view: "added" | "list";
  status?: "draft" | "saved";
  spaceId: string;
  spaces: Array<{ id: string; name: string }>;
  items: ShoppingItem[];
  stores: string[];
  confirmationId?: string;
};
