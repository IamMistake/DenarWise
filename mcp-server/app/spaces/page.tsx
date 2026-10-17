import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SpacesView, type SpaceCardView } from "./spaces-view";
import { app } from "@/nextsignal/app";
import type { SpaceMember, ShoppingItem } from "@/nextsignal/domain/home";
import type {
  ShoppingListItemsInput,
  SpacesCreateInput,
  SpacesJoinInput,
  SpacesLeaveInput,
  SpacesListInput,
  SpacesListMembersInput
} from "@/nextsignal/schemas";
import type { SpaceSummary } from "@/nextsignal/services/spaces";
import { createWebSessionRequest } from "@/nextsignal/workos/request-context";
import {
  decryptWebSession,
  getSignOutUrl,
  getWebAuthCookieOptions,
  type WebAuthSession,
  webSessionCookieName
} from "@/nextsignal/workos/web-auth";

type SpacesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SpacesPage({ searchParams }: SpacesPageProps) {
  const session = await requirePageSession();
  const params = await searchParams;
  const error = readParam(params, "error");
  const message = readParam(params, "message");
  const displayName = [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.email;

  const spacesResult = await app.dispatch<SpacesListInput, SpaceSummary[]>("spaces.list", {}, {
    runtime: "api",
    request: createWebSessionRequest(session, "nextsignal://web/spaces")
  });
  const spaces = spacesResult.ok ? await loadSpaceCards(session, spacesResult.data ?? []) : [];
  const toast = error
    ? { tone: "error" as const, message: error }
    : message
      ? { tone: "success" as const, message }
      : !spacesResult.ok
        ? { tone: "error" as const, message: readResultError(spacesResult) }
        : null;

  return (
    <SpacesView
      displayName={displayName}
      spaces={spaces}
      toast={toast}
      actions={{
        create: createSpaceAction,
        join: joinSpaceAction,
        leave: leaveSpaceAction,
        signOut: signOutAction
      }}
    />
  );
}

async function loadSpaceCards(session: WebAuthSession, spaces: SpaceSummary[]): Promise<SpaceCardView[]> {
  return Promise.all(spaces.map(async (space) => {
    const [members, items] = await Promise.all([
      app.dispatch<SpacesListMembersInput, SpaceMember[]>("spaces.listMembers", { spaceId: space.id }, {
        runtime: "api",
        request: createWebSessionRequest(session, `nextsignal://web/spaces/${space.id}/members`)
      }),
      app.dispatch<ShoppingListItemsInput, ShoppingItem[]>("shopping.listItems", { spaceId: space.id }, {
        runtime: "api",
        request: createWebSessionRequest(session, `nextsignal://web/spaces/${space.id}/items`)
      })
    ]);

    return {
      ...space,
      members: members.ok ? members.data ?? [] : [],
      membersError: members.ok ? undefined : readResultError(members),
      items: items.ok ? items.data ?? [] : [],
      itemsError: items.ok ? undefined : readResultError(items)
    };
  }));
}

async function createSpaceAction(formData: FormData) {
  "use server";
  const session = await requirePageSession();
  const input: SpacesCreateInput = {
    name: String(formData.get("name") ?? "")
  };
  const result = await app.dispatch<SpacesCreateInput>("spaces.create", input, {
    runtime: "api",
    request: createWebSessionRequest(session, "nextsignal://web/spaces/create")
  });

  if (!result.ok) redirect(`/spaces?error=${encodeURIComponent(readResultError(result))}`);
  redirect("/spaces?message=Space%20created");
}

async function joinSpaceAction(formData: FormData) {
  "use server";
  const session = await requirePageSession();
  const input: SpacesJoinInput = {
    code: String(formData.get("code") ?? "")
  };
  const result = await app.dispatch<SpacesJoinInput>("spaces.join", input, {
    runtime: "api",
    request: createWebSessionRequest(session, "nextsignal://web/spaces/join")
  });

  if (!result.ok) redirect(`/spaces?error=${encodeURIComponent(readResultError(result))}`);
  redirect("/spaces?message=Space%20joined");
}

async function leaveSpaceAction(formData: FormData) {
  "use server";
  const session = await requirePageSession();
  const input: SpacesLeaveInput = {
    spaceId: String(formData.get("spaceId") ?? "")
  };
  const result = await app.dispatch<SpacesLeaveInput>("spaces.leave", input, {
    runtime: "api",
    request: createWebSessionRequest(session, "nextsignal://web/spaces/leave")
  });

  if (!result.ok) redirect(`/spaces?error=${encodeURIComponent(readResultError(result))}`);
  redirect("/spaces?message=Space%20left");
}

async function signOutAction() {
  "use server";
  const cookieStore = await cookies();
  const session = await decryptWebSession(cookieStore.get(webSessionCookieName)?.value);
  cookieStore.delete({
    name: webSessionCookieName,
    ...getWebAuthCookieOptions()
  });

  if (session) redirect(getSignOutUrl(session));
  redirect("/");
}

async function requirePageSession(): Promise<WebAuthSession> {
  const cookieStore = await cookies();
  const session = await decryptWebSession(cookieStore.get(webSessionCookieName)?.value);
  if (!session) redirect("/login");

  return session;
}

function readResultError(result: { errors: { publicMessage?: string; message: string }[]; meta?: { kind?: string } }) {
  if (result.meta?.kind === "system") {
    return "Something went wrong. Check the server logs and make sure database migrations have run.";
  }

  return result.errors.map((item) => item.publicMessage ?? item.message).join(" ");
}

function readParam(params: Record<string, string | string[] | undefined> | undefined, key: string) {
  const value = params?.[key];
  return Array.isArray(value) ? value[0] : value;
}
