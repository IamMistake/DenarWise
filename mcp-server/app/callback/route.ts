import {
  authenticateCallback,
  encryptWebSession,
  getWebAuthBaseUrl,
  getWebAuthCookieOptions,
  webPkceCookieName,
  webSessionCookieName
} from "@/nextsignal/workos/web-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const pkceCookie = request.cookies.get(webPkceCookieName)?.value;

  if (!code || !state || !pkceCookie) {
    return NextResponse.redirect(new URL("/login", getWebAuthBaseUrl()));
  }

  const pkce = JSON.parse(pkceCookie) as { state?: string; codeVerifier?: string; returnPath?: string };
  if (!pkce.state || !pkce.codeVerifier) {
    return NextResponse.redirect(new URL("/login", getWebAuthBaseUrl()));
  }

  const session = await authenticateCallback({
    code,
    state,
    expectedState: pkce.state,
    codeVerifier: pkce.codeVerifier
  });

  const response = NextResponse.redirect(new URL(normalizeReturnPath(pkce.returnPath) ?? "/", getWebAuthBaseUrl()));
  response.cookies.set(webSessionCookieName, await encryptWebSession(session), {
    ...getWebAuthCookieOptions(),
    maxAge: 60 * 60 * 24 * 7
  });
  response.cookies.delete({
    name: webPkceCookieName,
    ...getWebAuthCookieOptions()
  });

  return response;
}

function normalizeReturnPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}
