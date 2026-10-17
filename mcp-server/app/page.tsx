import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { CopyButton } from "./copy-button";
import { HeroStory } from "./hero-story";
import { MarketChip } from "./market-logo";
import { MarketplaceNotificationForm } from "./marketplace-notification-form";
import { McpPhotoCarousel } from "./mcp-photo-carousel";
import { ArrowIcon, CheckIcon, SiteNav } from "./site-nav";
import { MARKETS, formatDenars, sampleBasket, summarizeBasket } from "@/nextsignal/domain/price-matching";
import {
  decryptWebSession,
  getSignOutUrl,
  getWebAuthCookieOptions,
  webSessionCookieName
} from "@/nextsignal/workos/web-auth";

const MCP_URL = "https://denarwise.betta.chat/api/mcp";

export default async function HomePage() {
  const session = await getPageSession();
  const displayName = session
    ? [session.user.firstName, session.user.lastName].filter(Boolean).join(" ") || session.user.email
    : null;
  const primaryLabel = displayName ? "Open your spaces" : "Create a shopping space";
  const basket = summarizeBasket(sampleBasket.lines);

  return (
    <main className="hs">
      <SiteNav links={[{ href: "#how", label: "How it works" }, { href: "#price", label: "Best price" }, { href: "#connect", label: "Connect" }]}>
        {displayName ? (
          <>
            <span className="hs-user">{displayName}</span>
            <form action={signOutAction}>
              <button className="hs-btn hs-btn--small hs-btn--ghost" type="submit">Sign out</button>
            </form>
            <a className="hs-btn hs-btn--small hs-btn--green" href="/spaces">Spaces</a>
          </>
        ) : (
          <a className="hs-btn hs-btn--small hs-btn--green" href="/login">Sign in</a>
        )}
      </SiteNav>

      <section className="hs-hero">
        <div className="hs-wrap hs-hero-grid">
          <div>
            <p className="hs-eyebrow">DenarWise · Spend fewer denars</p>
            <h1>
              Your shopping list, <span className="hs-mark">cheapest</span> in every market.
            </h1>
            <p className="hs-lede">
              Tell Claude or ChatGPT what you need. DenarWise matches every item to real products in nine Macedonian supermarkets, shows where each one costs the least, and keeps one list for the whole household.
            </p>
            <div className="hs-actions">
              <a className="hs-btn hs-btn--green" href="/spaces">{primaryLabel}<ArrowIcon /></a>
              <a className="hs-btn" href="#how">See how it works</a>
            </div>
            <div className="hs-proof">
              <span><CheckIcon /> Works in Claude and ChatGPT</span>
              <span><CheckIcon /> Prices in denars</span>
              <span><CheckIcon /> You confirm before anything is saved</span>
            </div>
          </div>
          <HeroStory />
        </div>
      </section>

      <section className="hs-markets" id="markets" aria-label="Markets we compare">
        <div className="hs-wrap hs-markets-inner">
          <p>Comparing 9 markets</p>
          <ul>
            {MARKETS.map((market) => <li key={market}><MarketChip market={market} size={24} /></li>)}
          </ul>
        </div>
      </section>

      <section className="hs-section" id="how">
        <div className="hs-wrap">
          <div className="hs-head">
            <div>
              <p className="hs-eyebrow">How it works</p>
              <h2>One list. Everyone in sync.</h2>
            </div>
            <p>Set it up once and the whole household, plus the AI you already use, works from the same list.</p>
          </div>
          <ol className="hs-steps">
            <Step number="1" title="Create a space">
              Make a space for your household, a trip, or the office. Share the invite code and everyone is in.
            </Step>
            <Step number="2" title="Connect your AI">
              Add one MCP URL to Claude or ChatGPT and sign in. Every space you belong to is ready in the chat.
            </Step>
            <Step number="3" title="Shop smarter">
              Ask your AI to add items. DenarWise finds the real products, shows the cheapest market, and waits for your OK.
            </Step>
          </ol>
        </div>
      </section>

      <section className="hs-section hs-dark is-dark" id="price">
        <div className="hs-wrap">
          <div className="hs-head">
            <div>
              <p className="hs-eyebrow">How we find your best price</p>
              <h2>Same milk. Nine price lists.</h2>
            </div>
            <p>Supermarkets in North Macedonia must publish their prices. DenarWise reads them for you, so the shop you pick is the one that actually costs the least.</p>
          </div>
          <ol className="hs-flow">
            <li><h3>Search</h3><p>Your AI sends the item, a few keywords and an optional market. We search the published price lists.</p></li>
            <li><h3>Group</h3><p>The same product sold in several stores becomes one product with a price for each store.</p></li>
            <li><h3>Check</h3><p>An AI check removes look-alikes, like wafers that only contain milk, so you only see real matches.</p></li>
            <li><h3>Pick</h3><p>Choose the product, see the cheapest market, and confirm. Nothing is saved until you do.</p></li>
          </ol>
          <div className="hs-basket-demo">
            <div>
              <span className="hs-sample">Sample basket</span>
              <h3 style={{ marginTop: 12 }}>2× milk and a protein bread</h3>
              <p>Buy everything in one market, or split the list where each item is cheapest.</p>
            </div>
            <div className="hs-basket-totals">
              <div>
                <small>One store · {basket.singleStore?.store}</small>
                <strong className="hs-num">{basket.singleStore ? formatDenars(basket.singleStore.total) : "—"}</strong>
              </div>
              <div className="is-best">
                <small>Split across {basket.splitStores.length} stores</small>
                <strong className="hs-num">{formatDenars(basket.splitTotal)}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hs-section" aria-labelledby="action-title">
        <div className="hs-wrap hs-action">
          <div>
            <p className="hs-eyebrow">In action</p>
            <h2 id="action-title">Right inside the chat.</h2>
            <ul className="hs-checks">
              <li><span>1</span>Ask which spaces you have, in plain words.</li>
              <li><span>2</span>Add a whole list in one message and review it as a card.</li>
              <li><span>3</span>Check what is left, then clear the basket after the shop.</li>
            </ul>
          </div>
          <div className="hs-phone">
            <span className="hs-sticker hs-sticker--lime" aria-hidden="true">Real screenshots</span>
            <McpPhotoCarousel />
          </div>
        </div>
      </section>

      <section className="hs-section hs-connect" id="connect">
        <div className="hs-wrap">
          <div className="hs-head">
            <div>
              <p className="hs-eyebrow">Connect your favorite AI</p>
              <h2>One URL. Your lists, everywhere.</h2>
            </div>
            <p>DenarWise uses OAuth to connect your account securely. Add the server once, sign in, and every space you belong to is ready for the conversation.</p>
          </div>

          <div className="hs-url">
            <span>MCP server URL</span>
            <code>{MCP_URL}</code>
            <span className="hs-oauth"><CheckIcon size={14} /> OAuth on</span>
            <CopyButton value={MCP_URL} label="Copy URL" />
          </div>

          <div className="hs-clients">
            <ClientCard client="Claude" logoSrc="/claude-logo.webp">
              Open Claude&apos;s connector settings, choose to add a custom MCP server, and paste the DenarWise URL. Keep OAuth enabled, then sign in when prompted.
            </ClientCard>
            <ClientCard client="ChatGPT" logoSrc="/chatgpt-logo.png">
              Open ChatGPT&apos;s connector settings, add a custom MCP server with the DenarWise URL, and enable OAuth. Sign in to authorize your shopping spaces.
            </ClientCard>
            <aside className="hs-notify is-dark">
              <div>
                <p className="hs-eyebrow">Prefer one-click install?</p>
                <h3>Know when DenarWise lands in the app marketplaces.</h3>
                <p>Leave your email and we&apos;ll tell you when DenarWise is available directly in Claude or ChatGPT.</p>
              </div>
              <MarketplaceNotificationForm />
            </aside>
          </div>
        </div>
      </section>

      <footer className="hs-footer">
        <div className="hs-wrap">
          <a className="hs-brand" href="/">
            <Image src="/denarwise-logo.png" alt="" width={32} height={32} />
            <span>DenarWise</span>
          </a>
          <p>DenarWise. Prices shown on this page are sample data. Market logos belong to their owners.</p>
        </div>
      </footer>
    </main>
  );
}

function ClientCard({ children, client, logoSrc }: { children: ReactNode; client: string; logoSrc: string }) {
  return (
    <article className="hs-client">
      <div className="hs-client-head">
        <span aria-hidden="true"><Image src={logoSrc} alt="" width={34} height={34} /></span>
        <h3>Add DenarWise to {client}</h3>
      </div>
      <p>{children}</p>
      <span className="hs-oauth"><CheckIcon size={14} /> OAuth must be enabled</span>
    </article>
  );
}

function Step({ children, number, title }: { children: ReactNode; number: string; title: string }) {
  return (
    <li className="hs-step">
      <span className="hs-step-num">{number}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </li>
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
