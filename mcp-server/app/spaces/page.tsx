import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { app } from "@/nextsignal/app";
import type { HomeSpaceMember } from "@/nextsignal/domain/home";
import type { SpacesCreateInput, SpacesJoinInput, SpacesLeaveInput, SpacesListInput, SpacesListMembersInput } from "@/nextsignal/schemas";
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

type SpaceCardView = SpaceSummary & {
  members: HomeSpaceMember[];
  membersError?: string;
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
    <main className="editorial editorial-spaces">
      {toast ? <Toast tone={toast.tone} message={toast.message} /> : null}

      <section className="editorial-spaces-shell">
        <header className="editorial-nav editorial-spaces-nav">
          <a className="editorial-brand" href="/">
            <span className="editorial-brand-mark" aria-hidden="true">
              <Image src="/homespace-logo.png" alt="" width={46} height={46} priority />
            </span>
            <span>HomeSpace</span>
          </a>
          <div className="editorial-nav-actions">
            <a className="editorial-nav-link" href="/">Home</a>
            <span className="editorial-user">{displayName}</span>
            <form action={signOutAction}>
              <button className="editorial-link-button" type="submit">Sign out</button>
            </form>
          </div>
        </header>

        <div className="editorial-spaces-body">
          <section aria-label="Home space">
            <SpacesDashboard spaces={spaces} />
          </section>
        </div>
      </section>
    </main>
  );
}

function SpacesDashboard({ spaces }: { spaces: SpaceCardView[] }) {
  return (
    <div className="editorial-dashboard">
      <aside className="editorial-dashboard-intro">
        <p className="editorial-kicker">Your shopping spaces</p>
        <h1>A shared list for every space.</h1>
        <p>
          Create or join shopping spaces here, then connect your favorite AI agent to add, check, update, and clear each shared list.
        </p>
      </aside>

      <div className="editorial-dashboard-content">
        <SpaceForms />
        <SpacesList spaces={spaces} />
      </div>
    </div>
  );
}

function SpaceForms() {
  return (
    <div className="editorial-space-forms">
      <div className="editorial-form-card editorial-form-primary">
        <p className="editorial-card-index">01 / Create</p>
        <h2>Start a new space</h2>
        <form action={createSpaceAction}>
          <label>
            Space name
            <input
              name="name"
              required
              maxLength={80}
              placeholder="Home"
            />
          </label>
          <button type="submit">Create space <span aria-hidden="true">↗</span></button>
        </form>
      </div>

      <div className="editorial-form-card">
        <p className="editorial-card-index">02 / Join</p>
        <h2>Enter an invite code</h2>
        <form action={joinSpaceAction}>
          <label>
            Invite code
            <input
              name="code"
              required
              maxLength={32}
              placeholder="ABCD2345"
            />
          </label>
          <button type="submit">Join space <span aria-hidden="true">→</span></button>
        </form>
      </div>
    </div>
  );
}

function SpacesList({ spaces }: { spaces: SpaceCardView[] }) {
  if (spaces.length === 0) {
    return (
      <div className="editorial-empty">
        <p>No spaces yet</p>
        <span>Create a space or join one with an invite code.</span>
      </div>
    );
  }

  return (
    <div className="editorial-space-list">
      <div className="editorial-list-heading">
        <div>
          <p className="editorial-kicker">Joined spaces</p>
          <h2>Your spaces</h2>
        </div>
        <p>{spaces.length} total</p>
      </div>

      <div className="editorial-space-grid">
        {spaces.map((space) => (
          <SpaceCard key={space.id} space={space} />
        ))}
      </div>
    </div>
  );
}

function SpaceCard({ space }: { space: SpaceCardView }) {
  return (
    <article className="editorial-space-card">
      <div className="editorial-space-card-heading">
        <div>
          <p>{space.role}</p>
          <h3>{space.name}</h3>
        </div>
        <details className="editorial-card-menu">
          <summary
            aria-label={`Actions for ${space.name}`}
          >
            ...
          </summary>
          <div>
            <form action={leaveSpaceAction}>
              <input type="hidden" name="spaceId" value={space.id} />
              <button type="submit">
                Leave space
              </button>
            </form>
          </div>
        </details>
      </div>

      <dl className="editorial-space-data">
        <div className="editorial-member-count">
          <dt>Members</dt>
          <dd>{space.memberCount}</dd>
        </div>
        <div className="editorial-members">
          <dt>Space members</dt>
          <dd>
            {space.membersError ? (
              <p className="editorial-error">{space.membersError}</p>
            ) : (
              <ul>
                {space.members.map((member) => (
                  <li key={member.userId}>
                    <span>
                      <strong>{member.displayName || member.email}</strong>
                      <small>{member.email}</small>
                    </span>
                    <em>{member.role}</em>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
        <div className="editorial-code-row">
          <dt>Invite code</dt>
          <dd>{space.inviteCode}</dd>
        </div>
        <div className="editorial-id-row">
          <dt>Space id</dt>
          <dd>{space.id}</dd>
        </div>
      </dl>
    </article>
  );
}

function Toast({ tone, message }: { tone: "success" | "error"; message: string }) {
  return (
    <div
      className={`editorial-toast ${tone}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <span>{tone === "error" ? "Could not update" : "Done"}</span>
      <p>{message}</p>
    </div>
  );
}

async function loadSpaceCards(session: WebAuthSession, spaces: SpaceSummary[]): Promise<SpaceCardView[]> {
  return Promise.all(spaces.map(async (space) => {
    const result = await app.dispatch<SpacesListMembersInput, HomeSpaceMember[]>("spaces.listMembers", { spaceId: space.id }, {
      runtime: "api",
      request: createWebSessionRequest(session, `nextsignal://web/spaces/${space.id}/members`)
    });

    return {
      ...space,
      members: result.ok ? result.data ?? [] : [],
      membersError: result.ok ? undefined : readResultError(result)
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
