import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { App } from "@/nextsignal/app";

type McpToolExtra = {
  authInfo?: AuthInfo;
};

export async function dispatchMcpTool<TInput>(
  app: App,
  processName: string,
  input: TInput,
  extra: McpToolExtra
) {
  return app.dispatch<TInput>(processName, input, {
    runtime: "api",
    request: {
      method: "MCP",
      url: "mcp://tool",
      headers: getAuthHeaders(extra.authInfo)
    }
  });
}

function getAuthHeaders(authInfo: AuthInfo | undefined) {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string" || !userId) return {} as Record<string, string>;

  return {
    "x-nextsignal-user-id": userId
  } satisfies Record<string, string>;
}
