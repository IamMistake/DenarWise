import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Result } from "@gotch/nextsignal";

export function toMcpToolResult(result: Result<unknown>): CallToolResult {
  if (!result.ok) {
    return {
      isError: true,
      structuredContent: {
        errors: result.meta.kind === "system" ? [{ message: "The operation failed. See the diagnostic reference." }] : result.errors,
        meta: result.meta
      },
      content: [
        {
          type: "text",
          text: result.errors
            .map((error) => result.meta.kind === "system" ? `The operation failed. Reference: ${result.meta.correlationId ?? "unknown"}.` : error.publicMessage ?? error.message)
            .join("\n")
        }
      ]
    };
  }

  return {
    structuredContent: asStructuredContent(result.data),
    content: [
      {
        type: "text",
        text: JSON.stringify(result.data ?? null, null, 2)
      }
    ]
  };
}

function asStructuredContent(data: unknown): Record<string, unknown> | undefined {
  if (data === null || data === undefined) return undefined;
  if (typeof data === "object" && !Array.isArray(data)) return data as Record<string, unknown>;
  return { value: data };
}
