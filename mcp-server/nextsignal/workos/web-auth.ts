import { WorkOS, type AuthenticationResponse, type User } from "@workos-inc/node";
import { decodeJwt, EncryptJWT, jwtDecrypt } from "jose";

export const webSessionCookieName = "nextsignal-workos-session";
export const webPkceCookieName = "nextsignal-workos-pkce";

export type WebAuthConfig = {
  apiKey: string;
  clientId: string;
  cookiePassword: string;
  redirectUri: string;
};

export type WebAuthSession = {
  accessToken: string;
  refreshToken: string;
  sessionId: string;
  organizationId?: string;
  user: User;
};

let workos: WorkOS | undefined;

export function getWebAuthConfig(): WebAuthConfig {
  return {
    apiKey: requireEnv("NEXTSIGNAL_WORKOS__APIKEY"),
    clientId: requireEnv("NEXTSIGNAL_WORKOS__CLIENTID"),
    cookiePassword: requireEnv("NEXTSIGNAL_WORKOS__COOKIEPASSWORD"),
    redirectUri: requireEnv("NEXTSIGNAL_WORKOS__REDIRECTURI")
  };
}

export function getWebAuthBaseUrl() {
  return new URL(getWebAuthConfig().redirectUri).origin;
}

export function getWebAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: getWebAuthConfig().redirectUri.startsWith("https://"),
    path: "/"
  };
}

export async function createSignInUrl() {
  const config = getWebAuthConfig();
  const { url, state, codeVerifier } = await getWorkOS().userManagement.getAuthorizationUrlWithPKCE({
    clientId: config.clientId,
    provider: "authkit",
    redirectUri: config.redirectUri,
    screenHint: "sign-in"
  });

  return {
    url,
    state,
    codeVerifier
  };
}

export async function authenticateCallback(input: {
  code: string;
  codeVerifier: string;
  state: string;
  expectedState: string;
}) {
  if (input.state !== input.expectedState) {
    throw new Error("Invalid WorkOS authentication state.");
  }

  const config = getWebAuthConfig();
  const response = await getWorkOS().userManagement.authenticateWithCode({
    clientId: config.clientId,
    code: input.code,
    codeVerifier: input.codeVerifier
  });

  return createSession(response);
}

export async function encryptWebSession(session: WebAuthSession) {
  return new EncryptJWT({ session })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .encrypt(await getCookieKey());
}

export async function decryptWebSession(value: string | undefined): Promise<WebAuthSession | null> {
  if (!value) return null;

  try {
    const { payload } = await jwtDecrypt(value, await getCookieKey());
    return isWebAuthSession(payload.session) ? payload.session : null;
  } catch {
    return null;
  }
}

export function getSignOutUrl(session: WebAuthSession) {
  return getWorkOS().userManagement.getLogoutUrl({
    sessionId: session.sessionId,
    returnTo: getWebAuthBaseUrl()
  });
}

function getWorkOS() {
  workos ??= new WorkOS(getWebAuthConfig().apiKey);
  return workos;
}

function createSession(response: AuthenticationResponse): WebAuthSession {
  const claims = decodeJwt<{ sid?: string; org_id?: string }>(response.accessToken);
  if (!claims.sid) {
    throw new Error("WorkOS access token is missing a session id.");
  }

  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    sessionId: claims.sid,
    organizationId: response.organizationId ?? claims.org_id,
    user: response.user
  };
}

async function getCookieKey() {
  const password = getWebAuthConfig().cookiePassword;
  if (password.length < 32) {
    throw new Error("NEXTSIGNAL_WORKOS__COOKIEPASSWORD must be at least 32 characters.");
  }

  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password)));
}

function requireEnv(name: `NEXTSIGNAL_${string}`) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required env value: ${name}`);
  }

  return value;
}

function isWebAuthSession(value: unknown): value is WebAuthSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<WebAuthSession>;

  return (
    typeof session.accessToken === "string" &&
    typeof session.refreshToken === "string" &&
    typeof session.sessionId === "string" &&
    Boolean(session.user) &&
    typeof session.user === "object"
  );
}
