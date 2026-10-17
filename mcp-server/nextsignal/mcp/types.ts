import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { App } from "@/nextsignal/app";

export type NextSignalMcpToolContext = {
  app: App;
};

export type NextSignalMcpTool = {
  register(server: McpServer, context: NextSignalMcpToolContext): void;
};
