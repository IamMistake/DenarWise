import { createSignInUrl, decryptWebSession, getWebAuthCookieOptions, webPkceCookieName, webSessionCookieName } from "@/nextsignal/workos/web-auth";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export default async function proxy(request: NextRequest) {
  const session = await decryptWebSession(request.cookies.get(webSessionCookieName)?.value);
  if (session) return NextResponse.next();

  const signIn = await createSignInUrl();
  const response = NextResponse.redirect(signIn.url);
  response.cookies.set(webPkceCookieName, JSON.stringify({
    state: signIn.state,
    codeVerifier: signIn.codeVerifier,
    returnPath: `${request.nextUrl.pathname}${request.nextUrl.search}`
  }), {
    ...getWebAuthCookieOptions(),
    maxAge: 60 * 10
  });
  return response;
}

export const config = {
  matcher: ["/spaces/:path*"]
};
