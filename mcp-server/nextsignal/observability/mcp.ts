import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { correlationId, log, stage, withLogScope } from "./context";

/** Observe the protocol boundary, including SDK validation failures before a tool handler runs. */
export function instrumentMcp(server: McpServer) {
  // The SDK converts thrown tool errors to result objects; observe callbacks before
  // that conversion so stack traces are recorded and private details stay server-side.
  const registerTool = server.registerTool.bind(server);
  server.registerTool = ((name: string, config: unknown, handler: (...args: unknown[]) => unknown) =>
    Reflect.apply(registerTool, server, [name, config, async (...args: unknown[]) => {
      try {
        return await stage("mcp.handler", { tool: name }, async () => handler(...args));
      } catch {
        return { isError: true, content: [{ type: "text", text: `The operation failed. Reference: ${correlationId() ?? "unknown"}.` }] };
      }
    }])) as typeof server.registerTool;
  const protocol = server.server;
  const register = protocol.setRequestHandler.bind(protocol);
  protocol.setRequestHandler = ((schema: unknown, handler: (...args: unknown[]) => Promise<unknown>) => {
    const wrapped = schema === CallToolRequestSchema ? async (...args: unknown[]) => {
      const request = args[0] as { params?: { name?: string } };
      const tool = request.params?.name ?? "unknown";
      return withLogScope({ correlationId: crypto.randomUUID(), process: `mcp.${tool}` }, async () => {
        try {
          return await stage("mcp.tool", { tool }, async () => {
            const result = await handler(...args);
            if (result && typeof result === "object" && "isError" in result && result.isError) await log("warn", "mcp.tool.fault", { tool });
            return result;
          });
        } catch {
          return { isError: true, content: [{ type: "text", text: "The operation failed. Please retry; diagnostic details have been logged." }] };
        }
      });
    } : handler;
    return Reflect.apply(register, protocol, [schema, wrapped]);
  }) as typeof protocol.setRequestHandler;
}
