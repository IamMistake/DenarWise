import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { requireConfigString } from "@/nextsignal/config";

let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;

export async function getWorkOSAuthKitDomain(): Promise<string> {
  const domain = await requireConfigString("workos.authkitdomain");
  return domain.replace(/\/+$/, "");
}

export async function getMcpResourceUrl(): Promise<string> {
  const resourceUrl = await requireConfigString("mcp.resourceurl");
  return resourceUrl.replace(/\/+$/, "");
}

async function getJwks() {
  jwks ??= createRemoteJWKSet(new URL("/oauth2/jwks", await getWorkOSAuthKitDomain()));
  return jwks;
}

function getScopes(payload: JWTPayload): string[] {
  const raw = payload.scope ?? payload.scp;

  if (typeof raw === "string") {
    return raw.split(" ").filter(Boolean);
  }

  if (Array.isArray(raw)) {
    return raw.filter((scope): scope is string => typeof scope === "string");
  }

  return [];
}

function getClientId(payload: JWTPayload): string {
  for (const key of ["client_id", "azp", "cid"]) {
    const value = payload[key];

    if (typeof value === "string") {
      return value;
    }
  }

  return "workos-connect";
}

export async function verifyWorkOSBearerToken(token: string): Promise<AuthInfo> {
  const resourceUrl = await getMcpResourceUrl();
  const { payload } = await jwtVerify(token, await getJwks(), {
    issuer: await getWorkOSAuthKitDomain(),
    audience: resourceUrl
  });

  return {
    token,
    clientId: getClientId(payload),
    scopes: getScopes(payload),
    expiresAt: payload.exp,
    resource: new URL(resourceUrl),
    extra: {
      claims: payload,
      userId: payload.sub
    }
  };
}
