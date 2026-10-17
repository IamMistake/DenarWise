import { createMcpHandler } from "mcp-handler";
import { app } from "@/nextsignal/app";
import { mcpTools } from "@/nextsignal/mcp/tools";
import { registerShoppingAppResource } from "@/nextsignal/mcp/ui/shopping-resource";
import { instrumentMcp } from "@/nextsignal/observability/mcp";

export function createNextSignalMcpHandler() {
  return createMcpHandler(
    (server) => {
      instrumentMcp(server);
      registerShoppingAppResource(server);
      for (const tool of mcpTools) {
        tool.register(server, { app });
      }
    },
    {
      serverInfo: {
        name: "nextsignal-mcp-server",
        version: "0.2.0"
      }
    },
    {
      basePath: "/api",
      maxDuration: 60
    }
  );
}
