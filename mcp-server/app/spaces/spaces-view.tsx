import Image from "next/image";
import { CopyButton } from "../copy-button";
import { MarketChip, MarketLogo } from "../market-logo";
import { ArrowIcon, SiteNav } from "../site-nav";
import { LeaveSpace, Toast } from "./space-client";
import type { SpaceMember, ShoppingItem } from "@/nextsignal/domain/home";
import { MARKETS, formatDenars, sampleBasket, summarizeBasket } from "@/nextsignal/domain/price-matching";
import type { SpaceSummary } from "@/nextsignal/services/spaces";

export type SpaceCardView = SpaceSummary & {
  members: SpaceMember[];
  membersError?: string;
  items: ShoppingItem[];
  itemsError?: string;
};

export type SpacesViewActions = {
  create: (formData: FormData) => void | Promise<void>;
  join: (formData: FormData) => void | Promise<void>;
  leave: (formData: FormData) => void | Promise<void>;
  signOut: () => void | Promise<void>;
};

export type SpacesViewProps = {
  displayName: string;
  spaces: SpaceCardView[];
  actions: SpacesViewActions;
  toast: { tone: "success" | "error"; message: string } | null;
};

export function SpacesView({ displayName, spaces, actions, toast }: SpacesViewProps) {
  const memberTotal = spaces.reduce((sum, space) => sum + space.memberCount, 0);
  const firstName = displayName.split(" ")[0];

  return (
    <main className="hs">
      {toast ? <Toast tone={toast.tone} message={toast.message} /> : null}

      <SiteNav links={[{ href: "/", label: "Home" }, { href: "/spaces", label: "Spaces", current: true }]}>
        <span className="hs-user">{displayName}</span>
        <form action={actions.signOut}>
          <button className="hs-btn hs-btn--small hs-btn--ghost" type="submit">Sign out</button>
        </form>
      </SiteNav>

      <div className="hs-wrap hs-dash">
        <section className="hs-dash-head" aria-labelledby="spaces-title">
          <div>
            <p className="hs-eyebrow">Hi {firstName}</p>
            <h1 id="spaces-title">Your <span className="hs-mark">shopping</span> spaces</h1>
            <p>Create or join a space, then connect your AI to add items, compare prices across markets, and clear the list after the shop.</p>
          </div>
          <dl className="hs-stats">
            <div><dt>Spaces</dt><dd>{spaces.length}</dd></div>
            <div><dt>People</dt><dd>{memberTotal}</dd></div>
          </dl>
        </section>

        <StartCards actions={actions} />

        {spaces.length === 0 ? <EmptyState /> : <SpacesList spaces={spaces} leave={actions.leave} />}
      </div>
    </main>
  );
}

function StartCards({ actions }: { actions: SpacesViewActions }) {
  return (
    <section className="hs-start" aria-label="Create or join a space">
      <div className="hs-start-card hs-start-card--primary" id="create-space">
        <span className="hs-step-label">New space</span>
        <h2>Start a shared list</h2>
        <form action={actions.create}>
          <label>
            Space name
            <input name="name" required maxLength={80} placeholder="e.g. Home" autoComplete="off" />
          </label>
          <button className="hs-btn hs-btn--sun" type="submit">Create space <ArrowIcon /></button>
        </form>
        <p className="hint">Then share the invite code with the people you shop with.</p>
      </div>

      <div className="hs-start-card" id="join-space">
        <span className="hs-step-label" style={{ background: "var(--color-mint)", color: "var(--color-green-ink)" }}>Join</span>
        <h2>Got an invite code?</h2>
        <form action={actions.join}>
          <label>
            Invite code
            <input name="code" required maxLength={32} placeholder="ABCD2345" autoComplete="off" spellCheck={false} />
          </label>
          <button className="hs-btn" type="submit">Join space</button>
        </form>
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <section className="hs-empty" aria-labelledby="empty-title">
      <span className="hs-empty-art" aria-hidden="true">
        <Image src="/denarwise-logo.png" alt="" width={64} height={64} />
      </span>
      <div>
        <h2 id="empty-title">No spaces yet</h2>
        <p>A space is one shared shopping list. Create your first one above, or ask someone in your household for their invite code.</p>
        <div className="hs-actions">
          <a className="hs-btn hs-btn--small hs-btn--green" href="#create-space">Create a space</a>
          <a className="hs-btn hs-btn--small" href="#join-space">Join with a code</a>
        </div>
      </div>
    </section>
  );
}

function SpacesList({ spaces, leave }: { spaces: SpaceCardView[]; leave: SpacesViewActions["leave"] }) {
  return (
    <section aria-labelledby="joined-title">
      <div className="hs-list-head">
        <h2 id="joined-title">Your spaces</h2>
        <p>{spaces.length} total</p>
      </div>
      <div className="hs-space-grid">
        {spaces.map((space) => <SpaceCard key={space.id} space={space} leave={leave} />)}
      </div>
    </section>
  );
}

function SpaceCard({ space, leave }: { space: SpaceCardView; leave: SpacesViewActions["leave"] }) {
  const visibleMembers = space.members.slice(0, 5);
  const hiddenMembers = Math.max(0, space.memberCount - visibleMembers.length);
  const visibleItems = space.items.slice(0, 4);
  const basket = summarizeBasket(sampleBasket.lines);

  return (
    <article className="hs-space" aria-labelledby={`space-${space.id}`}>
      <div className="hs-space-head">
        <h3 id={`space-${space.id}`}>{space.name}</h3>
        <span className={`hs-role ${space.role === "owner" ? "" : "hs-role--member"}`}>{space.role}</span>
      </div>

      <div className="hs-space-section">
        <span className="hs-label">{space.memberCount} {space.memberCount === 1 ? "member" : "members"}</span>
        {space.membersError ? (
          <p className="hs-error">{space.membersError}</p>
        ) : (
          <details className="hs-members">
            <summary>
              <span className="hs-avatars" aria-hidden="true">
                {visibleMembers.map((member) => (
                  <span className="hs-avatar" key={member.userId}>{initials(member.displayName || member.email)}</span>
                ))}
                {hiddenMembers > 0 ? <span className="hs-avatar">+{hiddenMembers}</span> : null}
              </span>
              <span className="hs-members-note">Show members</span>
            </summary>
            <ul>
              {space.members.map((member) => (
                <li key={member.userId}>
                  <span>
                    <strong>{member.displayName || member.email}</strong>
                    <small>{member.email}</small>
                  </span>
                  <span className={`hs-role ${member.role === "owner" ? "" : "hs-role--member"}`}>{member.role}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="hs-space-section">
        <span className="hs-label">Invite code</span>
        <div className="hs-invite">
          <code>{space.inviteCode}</code>
          <CopyButton value={space.inviteCode} label="Copy" />
        </div>
      </div>

      <div className="hs-space-section">
        <span className="hs-label">On the list</span>
        {space.itemsError ? (
          <p className="hs-error">{space.itemsError}</p>
        ) : visibleItems.length === 0 ? (
          <p className="hs-more">All clear. Ask your AI to add something.</p>
        ) : (
          <>
            <ul className="hs-items">
              {visibleItems.map((item) => (
                <li key={item.id}>
                  <span>
                    <strong>{item.name}</strong>
                    <StoreLabel store={item.store} />
                  </span>
                  <span className="hs-qty">× {item.quantity}</span>
                </li>
              ))}
            </ul>
            {space.items.length > visibleItems.length ? <p className="hs-more">+ {space.items.length - visibleItems.length} more</p> : null}
          </>
        )}
      </div>

      {space.items.length > 0 ? (
        <div className="hs-basket">
          <div className="hs-basket-top">
            <span className="hs-label">Cheapest basket</span>
            <span className="hs-sample">Sample data</span>
          </div>
          {basket.singleStore ? (
            <div className="hs-basket-row">
              <MarketChip market={basket.singleStore.store} size={20} />
              <span><span className="sr-only">One store total </span><b>{formatDenars(basket.singleStore.total)}</b></span>
            </div>
          ) : null}
          <div className="hs-basket-row is-best">
            <span style={{ fontWeight: 700 }}>Split across {basket.splitStores.length} stores</span>
            <b>{formatDenars(basket.splitTotal)}</b>
          </div>
        </div>
      ) : null}

      <div className="hs-space-foot">
        <details className="hs-details">
          <summary>Details</summary>
          <dl>
            <dt className="hs-label" style={{ margin: 0 }}>Space ID</dt>
            <dd>{space.id}<CopyButton value={space.id} label="Copy" /></dd>
          </dl>
        </details>
        <LeaveSpace spaceId={space.id} spaceName={space.name} action={leave} />
      </div>
    </article>
  );
}

function StoreLabel({ store }: { store: string | null }) {
  const market = MARKETS.find((name) => name.toLowerCase() === store?.trim().toLowerCase());
  if (!market) return <small>{store || "Any store"}</small>;
  return (
    <small className="hs-store">
      <span className="hs-market-logo" style={{ height: 22, padding: 3, borderRadius: 7 }}><MarketLogo market={market} size={14} /></span>
      {market}
    </small>
  );
}

function initials(value: string) {
  const parts = value.split(/[\s@._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "?") + (parts.length > 1 ? parts[1][0] : "")).toUpperCase();
}
