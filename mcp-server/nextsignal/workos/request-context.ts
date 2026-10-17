import type { WebAuthSession } from "@/nextsignal/workos/web-auth";

export function createWebSessionRequest(session: WebAuthSession, url = "nextsignal://web") {
  const displayName = [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.email;

  return {
    method: "WEB",
    url,
    headers: {
      "x-nextsignal-user-id": session.user.id,
      "x-nextsignal-user-name": displayName,
      "x-nextsignal-user-email": session.user.email
    }
  };
}
