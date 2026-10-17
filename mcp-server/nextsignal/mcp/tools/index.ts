import { spaceTools } from "@/nextsignal/mcp/tools/spaces";
import { shoppingTools } from "@/nextsignal/mcp/tools/shopping";
import type { NextSignalMcpTool } from "@/nextsignal/mcp/types";

export const mcpTools: NextSignalMcpTool[] = [
  ...spaceTools,
  ...shoppingTools
];
