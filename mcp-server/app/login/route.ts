import { createSignInUrl, getWebAuthCookieOptions, webPkceCookieName } from "@/nextsignal/workos/web-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const signIn = await createSignInUrl();
  const returnPath = normalizeReturnPath(request.nextUrl.searchParams.get("return_to")) ?? "/spaces";
  const response = NextResponse.redirect(signIn.url);
  response.cookies.set(webPkceCookieName, JSON.stringify({
    state: signIn.state,
    codeVerifier: signIn.codeVerifier,
    returnPath
  }), {
    ...getWebAuthCookieOptions(),
    maxAge: 60 * 10
  });

  return response;
}

function normalizeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}
