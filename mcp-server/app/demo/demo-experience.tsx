"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { CopyButton } from "../copy-button";
import { AnimatedDemo } from "./animated-demo";
import styles from "./demo.module.css";

const APP_URL = "https://denarwise.betta.chat";
const MCP_URL = `${APP_URL}/api/mcp`;
const slides = [
  { id: "what", label: "What it does" },
  { id: "watch", label: "The demo" },
  { id: "video", label: "Demo video" },
  { id: "how", label: "How we do it" },
  { id: "try", label: "Try it now" },
  { id: "team", label: "Team" }
] as const;
const agents = [
  { name: "DeepSeek", logo: "/agents/deepseek.svg" },
  { name: "Qwen", logo: "/agents/qwen.svg" },
  { name: "Claude", logo: "/claude-logo.webp" },
  { name: "ChatGPT", logo: "/chatgpt-logo.png" }
] as const;
const flow = [
  { name: "MCP", note: "Connects your chat", symbol: "↔" },
  { name: "Tools", note: "Fetch store offers", symbol: "⌘" },
  { name: "Laya", note: "Open-source matching", symbol: "λ" },
  { name: "Qwen", note: "Finds unique products", symbol: "≠" },
  { name: "You", note: "Choose. Confirm. Done.", symbol: "✓" }
] as const;

function Arrow({ back = false }: { back?: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={back ? { transform: "rotate(180deg)" } : undefined}><path d="M4 12h15m-6-6 6 6-6 6" /></svg>;
}

function Milk({ small = false }: { small?: boolean }) {
  return <svg className={small ? styles.smallMilk : styles.milk} viewBox="0 0 180 300" fill="none" aria-hidden="true">
    <path d="m25 62 32-40h78l22 40v211a8 8 0 0 1-8 8H33a8 8 0 0 1-8-8V62Z" fill="var(--color-surface)" stroke="var(--color-ink)" strokeWidth="4" />
    <path d="m57 22 27 40h73l-22-40H57Z" fill="var(--color-sun)" stroke="var(--color-ink)" strokeWidth="4" />
    <path d="M25 62h59v219H33a8 8 0 0 1-8-8V62Z" fill="var(--color-navy-2)" stroke="var(--color-ink)" strokeWidth="4" />
    <path d="M84 62h73v174H84z" fill="var(--color-navy)" />
    <rect x="100" y="13" width="28" height="15" rx="4" fill="var(--color-green)" stroke="var(--color-ink)" strokeWidth="3" />
    <text x="120" y="115" textAnchor="middle" fill="var(--color-on-navy)" fontSize="10" fontWeight="700">БИТОЛСКО</text>
    <text x="120" y="137" textAnchor="middle" fill="var(--color-on-navy)" fontSize="12" fontWeight="700">МЛЕКО</text>
    <text x="120" y="185" textAnchor="middle" fill="var(--color-lime)" fontSize="27" fontWeight="700">3.2%</text>
    <path d="M84 212c24-16 44 13 73-2v26H84v-24Z" fill="var(--color-mint)" />
    <text x="120" y="265" textAnchor="middle" fill="var(--color-ink)" fontSize="16" fontWeight="700">1 L</text>
  </svg>;
}

export function DemoExperience({ fontClassName }: { fontClassName: string }) {
  const deck = useRef<HTMLElement>(null);
  const demoVideo = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paused, setPaused] = useState(true);
  const [animationPaused, setAnimationPaused] = useState(false);
  const [fullscreenTip, setFullscreenTip] = useState(true);

  const goTo = useCallback((index: number) => {
    const next = Math.max(0, Math.min(slides.length - 1, index));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    deck.current?.scrollTo({ left: next * deck.current.clientWidth, behavior: reduceMotion ? "instant" : "smooth" });
    setMenuOpen(false);
  }, []);

  useEffect(() => {
    const index = slides.findIndex((item) => `#${item.id}` === window.location.hash);
    if (index >= 0 && deck.current) {
      deck.current.scrollTo({ left: index * deck.current.clientWidth, behavior: "instant" });
      setActive(index);
    }
    const onResize = () => {
      const index = Number(deck.current?.dataset.active ?? 0);
      deck.current?.scrollTo({ left: index * deck.current.clientWidth, behavior: "instant" });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F11") setFullscreenTip(false);
      if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLVideoElement) return;
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); goTo(active + (event.key === "ArrowRight" ? 1 : -1)); }
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, goTo]);

  useEffect(() => {
    const onFullscreen = () => { if (document.fullscreenElement) setFullscreenTip(false); };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, []);

  useEffect(() => {
    const video = demoVideo.current;
    if (!video) return;
    let cancelled = false;
    video.pause();
    video.currentTime = 0;
    setPaused(true);
    if (active === 2 && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void video.play().catch(() => {
        if (!cancelled) setPaused(true);
      });
    }
    return () => { cancelled = true; video.pause(); };
  }, [active]);

  useEffect(() => { setAnimationPaused(false); }, [active]);

  function toggleVideoPlayback() {
    const video = demoVideo.current;
    if (!video) return;
    if (video.paused) {
      void video.play().catch(() => setPaused(true));
    } else {
      video.pause();
    }
  }

  return <div className={`${styles.site} ${fontClassName}`}>
    {fullscreenTip && active === 0 && <aside className={styles.fullscreenTip} aria-label="Fullscreen tip"><span>For the best view, press <kbd>F11</kbd> for fullscreen.</span><button aria-label="Dismiss fullscreen tip" onClick={() => setFullscreenTip(false)}>×</button></aside>}
    <header className={styles.header}>
      <a className={styles.brand} href="#what" onClick={(event) => { event.preventDefault(); goTo(0); }}><Image src="/denarwise-logo.png" alt="" width={35} height={35} priority />DenarWise<span>.</span></a>
      <nav className={styles.nav} aria-label="Slides">
        <button className={styles.menuToggle} aria-expanded={menuOpen} aria-controls="deck-navigation" onClick={() => setMenuOpen(!menuOpen)}>Contents <span aria-hidden="true">⌄</span></button>
        <div id="deck-navigation" className={`${styles.navLinks} ${menuOpen ? styles.menuOpen : ""}`}>{slides.map((slide, index) => <a key={slide.id} href={`#${slide.id}`} aria-current={active === index ? "page" : undefined} onClick={(event) => { event.preventDefault(); goTo(index); }}>{slide.label}</a>)}</div>
      </nav>
      <a className={styles.source} href="https://github.com/gotch27/DenarWise" target="_blank" rel="noreferrer">Source ↗</a>
    </header>

    <main className={styles.deck} ref={deck} data-active={active} aria-label="DenarWise presentation" onScroll={(event) => {
      const target = event.currentTarget;
      const index = Math.max(0, Math.min(slides.length - 1, Math.round(target.scrollLeft / target.clientWidth)));
      if (index !== active) { setActive(index); window.history.replaceState(null, "", `#${slides[index].id}`); }
    }}>
      <section id="what" className={`${styles.slide} ${styles.intro}`} aria-labelledby="intro-title" inert={active !== 0}>
        <div className={styles.introCopy}><p className={styles.kicker}>AN MCP APPLICATION FOR YOUR GROCERIES.</p><h1 id="intro-title">Same milk.<br /><span>Less damage.</span></h1><p className={styles.introNote}>Cheaper groceries. One shared list.<br />Save the arguments for dinner.</p><div className={styles.agentContext}><p>Any MCP-compatible agent. Any model.</p><ul aria-label="Example models and assistants">{agents.map((agent) => <li key={agent.name}><Image src={agent.logo} alt="" width={28} height={28} /><span>{agent.name}</span></li>)}</ul></div><div className={styles.introActions}><button className={styles.startButton} onClick={() => goTo(1)}>Show me <Arrow /></button><aside className={styles.stickyNote}>Attach your shopping list.<br />Let AI handle the rest.</aside></div></div>
        <figure className={styles.milkScene}><div className={styles.sunDisc} /><Milk /><div className={styles.oldPrice}><del>75 ден</del><span>ouch.</span></div><div className={styles.newPrice}>61 ден<span>that’s better.</span></div><figcaption>Same cow. Different checkout.<small>Illustrative prices</small></figcaption></figure>
      </section>

      <section id="watch" className={`${styles.slide} ${styles.demo}`} aria-labelledby="demo-title" inert={active !== 1}>
        <AnimatedDemo active={active === 1} paused={animationPaused} milk={<Milk small />} />
      </section>

      <section id="video" className={`${styles.slide} ${styles.demo} ${styles.videoSlide}`} aria-labelledby="video-title" inert={active !== 2}>
        <div className={styles.demoHeading}><p className={styles.kicker}>BUILT AT THE HACKATHON.</p><h2 id="video-title">Our last-minute MCP demo.</h2><p className={styles.videoSubtitle}>A demo video of the MCP product we built at the last minute.</p></div>
        <div className={styles.videoStage}>
          <video ref={demoVideo} className={styles.recordedVideo} aria-label="DenarWise presentation video" controls muted playsInline loop preload="metadata" poster="/videos/denarwise-demo-poster.webp" width={568} height={320} onPlay={() => setPaused(false)} onPause={() => setPaused(true)}>
            <source src="/videos/denarwise-demo.mp4" type="video/mp4" />
            Your browser does not support video playback. <a href="/videos/denarwise-demo.mp4">Open the video.</a>
          </video>
        </div>
        <div className={styles.demoFoot}><span>Recorded MCP product demo</span></div>
      </section>

      <section id="how" className={`${styles.slide} ${styles.how}`} aria-labelledby="how-title" inert={active !== 3}>
        <div className={styles.howHeading}><p className={styles.kicker}>UNDER THE HOOD</p><h2 id="how-title">A chat goes in.<br /><span>A smarter list comes out.</span></h2></div>
        <ol className={styles.flow}>{flow.map((step, index) => <li key={step.name}><span className={styles.flowIcon} aria-hidden="true">{step.symbol}</span><h3>{step.name}</h3><p>{step.note}</p>{index < flow.length - 1 && <span className={styles.flowArrow} aria-hidden="true">→</span>}</li>)}</ol>
        <p className={styles.howFoot}>One product. All its prices. <strong>Your choice.</strong></p>
      </section>

      <section id="try" className={`${styles.slide} ${styles.trySlide}`} aria-labelledby="try-title" inert={active !== 4}>
        <div className={styles.tryContent}>
          <p className={styles.kicker}>YOUR NEXT SHOP STARTS HERE.</p>
          <h2 id="try-title">Try it. <span>Right now.</span></h2>
          <div className={styles.tryConnection}><span>MCP SERVER URL</span><div className={styles.tryUrl}><code>{MCP_URL}</code><CopyButton value={MCP_URL} label="Copy URL" className={styles.copyButton} /></div></div>
          <ol className={styles.trySteps}>
            <li><span>01</span><div><h3>Create a space.</h3><a href={`${APP_URL}/spaces`} target="_blank" rel="noreferrer">Open DenarWise ↗</a></div></li>
            <li><span>02</span><div><h3>Connect your agent.</h3><p>Paste the URL. Enable OAuth. Sign in.</p></div></li>
            <li><span>03</span><div><h3>Ask away.</h3><p>“Show my shopping spaces.”</p></div></li>
          </ol>
          <p className={styles.tryNote}>Use an MCP Apps–compatible client for the in-chat UI.</p>
        </div>
      </section>

      <section id="team" className={`${styles.slide} ${styles.team}`} aria-labelledby="team-title" inert={active !== 5}>
        <div><h2 id="team-title">TEAM:</h2><ul><li>Gorazd Filipovski</li><li>Stefan Lazarevski</li><li>Nikola Jagurinoski</li></ul></div>
      </section>
    </main>

    <footer className={styles.deckFooter}>
      <span className={styles.keyboardHint}>← → <span>or swipe</span></span>
      {active === 1 && <button className={styles.pauseButton} onClick={() => setAnimationPaused(!animationPaused)} aria-label={animationPaused ? "Resume demo animation" : "Pause demo animation"}>{animationPaused ? "▶ Resume" : "Ⅱ Pause"}</button>}
      {active === 2 && <button className={styles.pauseButton} onClick={toggleVideoPlayback} aria-label={paused ? "Resume demo video" : "Pause demo video"}>{paused ? "▶ Resume" : "Ⅱ Pause"}</button>}
      <div className={styles.slideControls}><button aria-label="Previous slide" disabled={active === 0} onClick={() => goTo(active - 1)}><Arrow back /></button><span aria-live="polite" aria-atomic="true">0{active + 1} <span>/ 0{slides.length}</span></span><button aria-label="Next slide" disabled={active === slides.length - 1} onClick={() => goTo(active + 1)}><Arrow /></button></div>
    </footer>
  </div>;
}
