import Image from "next/image";
import type { ReactNode } from "react";

export function SiteNav({
  links,
  children
}: {
  links: Array<{ href: string; label: string; current?: boolean }>;
  children: ReactNode;
}) {
  return (
    <header className="hs-nav">
      <a className="hs-brand" href="/">
        <Image src="/denarwise-logo.png" alt="" width={36} height={36} priority />
        <span>DenarWise</span>
      </a>
      <nav className="hs-nav-links" aria-label="Primary">
        {links.map((link) => (
          <a key={link.href} href={link.href} aria-current={link.current ? "page" : undefined}>{link.label}</a>
        ))}
      </nav>
      <div className="hs-nav-actions">{children}</div>
    </header>
  );
}

export function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  );
}

export function ArrowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}
