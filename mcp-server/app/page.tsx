import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { MarketplaceNotificationForm } from "./marketplace-notification-form";
import { McpPhotoCarousel } from "./mcp-photo-carousel";
import {
  decryptWebSession,
  getSignOutUrl,
  getWebAuthCookieOptions,
  webSessionCookieName
} from "@/nextsignal/workos/web-auth";

export default async function HomePage() {
  const session = await getPageSession();
  const displayName = session
    ? [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.email
    : null;
  const primaryLabel = displayName ? "Open your shopping spaces" : "Create a shopping space";

  return (
    <main className="editorial editorial-home">
      <section className="editorial-hero">
        <header className="editorial-nav">
          <a className="editorial-brand" href="/">
            <span className="editorial-brand-mark" aria-hidden="true">
              <Image src="/homespace-logo.png" alt="" width={46} height={46} priority />
            </span>
            <span>HomeSpace</span>
          </a>
          <nav className="editorial-nav-actions" aria-label="Primary">
            {displayName ? (
              <>
                <span className="editorial-user">{displayName}</span>
                <form action={signOutAction}>
                  <button className="editorial-link-button" type="submit">Sign out</button>
                </form>
              </>
            ) : (
              <a className="editorial-link-button" href="/login">Sign in</a>
            )}
          </nav>
        </header>

        <div className="editorial-hero-grid">
          <section className="editorial-copy">
            <p className="editorial-kicker">Shared shopping, AI assisted</p>
            <h1>
              Your shopping list,
              <span>ready for any AI.</span>
            </h1>
            <p className="editorial-lede">
              Create a space for every household, trip, or team. Then let the people you share it with—and the AI agent you already use—add, check, and clear the same shopping list.
            </p>
            <div className="editorial-actions">
              <a className="editorial-primary" href="/spaces">{primaryLabel}<span aria-hidden="true">↗</span></a>
              <a className="editorial-secondary" href="#connect">Connect your AI</a>
            </div>
            <div className="editorial-trust"><span>One list for every space</span><span>Works with the AI you already use</span></div>
          </section>

          <McpPhotoCarousel />
        </div>
      </section>

      <section className="editorial-how">
        <div className="editorial-how-heading">
          <p className="editorial-kicker">How it works</p>
          <h2>One list.<br />Everyone in sync.</h2>
        </div>
        <div className="editorial-steps">
            <Step number="01" title="Create a space">
              Make a shared space for your household, holiday, office, or anything else you shop for together.
            </Step>
            <Step number="02" title="Connect your AI">
              Add one MCP URL to ChatGPT or Claude and authorize access to your HomeSpace account.
            </Step>
            <Step number="03" title="Shop from anywhere">
              Ask your agent—or anyone in the space—to add items, check what is left, and clear the list after the shop.
            </Step>
        </div>
      </section>

      <section className="editorial-connect" id="connect">
        <div className="editorial-connect-intro">
          <div>
            <p className="editorial-kicker">Connect your favorite AI</p>
            <h2>One URL.<br /><em>Your lists, everywhere.</em></h2>
          </div>
          <p>
            HomeSpace uses OAuth to connect your account securely. Add the server to your AI client once, sign in, and every shopping space you belong to is ready for the conversation.
          </p>
        </div>

        <div className="editorial-server-url" aria-label="HomeSpace MCP server URL">
          <span>MCP server URL</span>
          <code>https://homespace.betta.chat/api/mcp</code>
          <strong>OAuth on</strong>
        </div>

        <div className="editorial-setup-grid">
          <ConnectionCard client="Claude" logoSrc="/claude-logo.webp" number="01">
            Open Claude&apos;s connector settings, choose to add a custom MCP server, and paste the HomeSpace URL. Keep OAuth enabled, then sign in when prompted.
          </ConnectionCard>
          <ConnectionCard client="ChatGPT" logoSrc="/chatgpt-logo.png" number="02">
            Open ChatGPT&apos;s connector settings, add a custom MCP server with the HomeSpace URL, and enable OAuth. Sign in to authorize your shopping spaces.
          </ConnectionCard>
          <aside className="editorial-marketplace-card">
            <div>
              <p className="editorial-kicker">Prefer one-click install?</p>
              <h3>Know when HomeSpace lands in the app marketplaces.</h3>
              <p>Leave your email and we&apos;ll tell you when the HomeSpace app is available directly in Claude or ChatGPT.</p>
            </div>
            <MarketplaceNotificationForm />
          </aside>
        </div>
      </section>
    </main>
  );
}

function ConnectionCard({ children, client, logoSrc, number }: { children: ReactNode; client: string; logoSrc: string; number: string }) {
  return (
    <article className="editorial-connection-card">
      <div className="editorial-connection-heading">
        <span>{number}</span>
        <span className="editorial-client-mark" aria-hidden="true">
          <Image src={logoSrc} alt="" width={32} height={32} />
        </span>
      </div>
      <h3>Add HomeSpace to {client}</h3>
      <p>{children}</p>
      <div className="editorial-oauth-note"><span aria-hidden="true">✓</span> OAuth must be enabled</div>
    </article>
  );
}

function Step({ children, number, title }: { children: ReactNode; number: string; title: string }) {
  return (
    <article className="editorial-step">
      <p>{number}</p>
      <h3>{title}</h3>
      <div>{children}</div>
    </article>
  );
}

async function getPageSession() {
  const cookieStore = await cookies();
  return decryptWebSession(cookieStore.get(webSessionCookieName)?.value);
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
