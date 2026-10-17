import { shoppingAppHtml } from "@/nextsignal/mcp/ui/generated/shopping-app-html";

// Serves the real bundled widget so it can be opened outside an MCP host.
// Add ?mock=<state> to render sample data. Development only.
export function GET() {
  if (process.env.NODE_ENV === "production") return new Response("Not found", { status: 404 });
  return new Response(shoppingAppHtml, { headers: { "content-type": "text/html; charset=utf-8" } });
}
