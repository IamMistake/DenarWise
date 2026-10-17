import { getWorkOSAuthKitDomain } from "@/nextsignal/mcp/workos-auth";

export const runtime = "nodejs";

const metadataHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Cache-Control": "max-age=3600"
};

export async function GET() {
  const response = await fetch(new URL("/.well-known/oauth-authorization-server", await getWorkOSAuthKitDomain()));
  const metadata = await response.json();

  return Response.json(metadata, {
    status: response.status,
    headers: metadataHeaders
  });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: metadataHeaders
  });
}
