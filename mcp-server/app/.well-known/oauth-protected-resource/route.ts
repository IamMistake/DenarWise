import { getMcpResourceUrl, getWorkOSAuthKitDomain } from "@/nextsignal/mcp/workos-auth";

export const runtime = "nodejs";

const metadataHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "max-age=3600"
};

export async function GET() {
  return Response.json(
    {
      resource: await getMcpResourceUrl(),
      authorization_servers: [await getWorkOSAuthKitDomain()],
      bearer_methods_supported: ["header"],
      scopes_supported: ["openid", "profile", "email", "offline_access"],
      resource_name: "Home MCP Server"
    },
    {
      headers: metadataHeaders
    }
  );
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: metadataHeaders
  });
}
