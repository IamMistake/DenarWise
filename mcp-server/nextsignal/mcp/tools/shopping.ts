import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import { z } from "zod";
import { dispatchMcpTool } from "@/nextsignal/mcp/tools/context";
import { toMcpToolResult } from "@/nextsignal/mcp/result";
import type { NextSignalMcpTool } from "@/nextsignal/mcp/types";
import { SHOPPING_APP_URI } from "@/nextsignal/mcp/ui/shopping-resource";
import { shoppingAddItemSchema as shoppingItemInputSchema, shoppingSearchProductsInputSchema, type ShoppingClearItemsInput } from "@/nextsignal/schemas";
import { listShoppingItems, previewShoppingItems, addShoppingItemsFromUi, updateShoppingItems, clearShoppingItemsFromUi } from "./shopping-handlers";

const itemFields = shoppingItemInputSchema.shape;
const shoppingAddItemSchema = {
  name: itemFields.name, query: itemFields.query, keywords: itemFields.keywords,
  quantity: itemFields.quantity, store: itemFields.store
};

const spaceIdSchema = z.string().min(1);
const itemIdSchema = z.string().min(1);

export const shoppingTools: NextSignalMcpTool[] = [
  {
    register(server, { app }) {
      registerAppTool(server, "shopping_ui_search_products", {
        title: "Find Products", description: "Refines or retries product matching for one widget row.",
        inputSchema: shoppingSearchProductsInputSchema.shape,
        annotations: { readOnlyHint: true },
        _meta: { ui: { resourceUri: SHOPPING_APP_URI, visibility: ["app"] } }
      }, async (input, extra) => toMcpToolResult(await dispatchMcpTool(app, "shopping.searchProducts", input, extra)));
    }
  },
  {
    register(server, context) {
      registerAppTool(
        server,
        "shopping_list_items",
        {
          title: "List Shopping Items",
          description: "Lists current shopping items in the requested space, optionally filtered by store.",
          inputSchema: {
            spaceId: spaceIdSchema,
            store: z.string().min(1).optional()
          },
          annotations: { readOnlyHint: true },
          _meta: {
            ui: { resourceUri: SHOPPING_APP_URI }
          }
        },
        async (input, extra) => listShoppingItems(context, input, extra)
      );
    }
  },
  {
    register(server, context) {
      registerAppTool(
        server,
        "shopping_add_item",
        {
          title: "Review Shopping Items",
          description: "Matches up to 20 shopping requests to real supermarket products for review. Provide the original query, 1–4 product keywords, a positive whole-number package quantity, and an optional strict store restriction. Legacy name input is supported. Nothing is added until the user clicks Add.",
          inputSchema: {
            spaceId: spaceIdSchema,
            ...shoppingAddItemSchema,
            items: z.array(shoppingItemInputSchema).min(1).max(20).optional()
          },
          annotations: { readOnlyHint: true, destructiveHint: false },
          _meta: {
            ui: { resourceUri: SHOPPING_APP_URI }
          }
        },
        async (input, extra) => previewShoppingItems(context, input, extra)
      );
    }
  },
  {
    register(server, context) {
      registerAppTool(
        server,
        "shopping_ui_add_items",
        {
          title: "Add Confirmed Shopping Items from UI",
          description: "Adds shopping items only after the user confirms the draft in the interactive shopping UI.",
          inputSchema: {
            spaceId: spaceIdSchema,
            confirmationId: z.string().uuid(),
            items: z.array(shoppingItemInputSchema).min(1).max(20)
          },
          annotations: { readOnlyHint: false, destructiveHint: false },
          _meta: {
            ui: {
              resourceUri: SHOPPING_APP_URI,
              visibility: ["app"]
            }
          }
        },
        async (input, extra) => addShoppingItemsFromUi(context, input, extra)
      );
    }
  },
  {
    register(server, { app }) {
      server.registerTool(
        "shopping_clear_items",
        {
          title: "Clear Shopping Items",
          description: "Clears requested space shopping items by id, name, store, or all, then emails other space members.",
          inputSchema: {
            spaceId: spaceIdSchema,
            all: z.boolean().optional(),
            ids: z.array(itemIdSchema).optional(),
            names: z.array(z.string().min(1)).optional(),
            store: z.string().min(1).optional()
          },
          annotations: { readOnlyHint: false, destructiveHint: true }
        },
        async (input, extra) => toMcpToolResult(await dispatchMcpTool<ShoppingClearItemsInput>(app, "shopping.clearItems", input, extra))
      );
    }
  },
  {
    register(server, context) {
      registerAppTool(
        server,
        "shopping_ui_update_items",
        {
          title: "Update Shopping Items from UI",
          description: "Updates shopping product selections, quantities, strict store restrictions, or space from the interactive shopping UI.",
          inputSchema: {
            spaceId: spaceIdSchema,
            itemIds: z.array(itemIdSchema).min(1),
            targetSpaceId: spaceIdSchema.optional(),
            updates: z.array(z.object({
              id: itemIdSchema,
              quantity: itemFields.quantity,
              productId: itemFields.productId,
              store: z.string().max(120).nullable().optional()
            })).min(1).optional()
          },
          annotations: { readOnlyHint: false, destructiveHint: false },
          _meta: {
            ui: {
              resourceUri: SHOPPING_APP_URI,
              visibility: ["app"]
            }
          }
        },
        async (input, extra) => updateShoppingItems(context, input, extra)
      );
    }
  },
  {
    register(server, context) {
      registerAppTool(
        server,
        "shopping_ui_clear_items",
        {
          title: "Clear Selected Shopping Items from UI",
          description: "Clears explicitly selected items from the interactive shopping list.",
          inputSchema: {
            spaceId: spaceIdSchema,
            ids: z.array(itemIdSchema).min(1)
          },
          annotations: { readOnlyHint: false, destructiveHint: true },
          _meta: {
            ui: {
              resourceUri: SHOPPING_APP_URI,
              visibility: ["app"]
            }
          }
        },
        async (input, extra) => clearShoppingItemsFromUi(context, input, extra)
      );
    }
  }
];
