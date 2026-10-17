import {
  registerAppResource,
  RESOURCE_MIME_TYPE
} from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { shoppingAppHtml } from "@/nextsignal/mcp/ui/generated/shopping-app-html";

export const SHOPPING_APP_URI = "ui://home-mcp/shopping-list.html";

export function registerShoppingAppResource(server: McpServer) {
  registerAppResource(
    server,
    "Shopping List",
    SHOPPING_APP_URI,
    {
      description: "Interactive shopping item editor and selectable shopping list.",
      _meta: {
        ui: {
          prefersBorder: false
        }
      }
    },
    async () => ({
      contents: [
        {
          uri: SHOPPING_APP_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: shoppingAppHtml,
          _meta: {
            ui: {
              prefersBorder: false
            }
          }
        }
      ]
    })
  );
}
