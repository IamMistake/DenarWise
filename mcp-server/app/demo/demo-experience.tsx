"use client";

import Image from "next/image";
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CopyButton } from "../copy-button";
import styles from "./demo.module.css";

const APP_URL = "https://denarwise.betta.chat";
const MCP_URL = `${APP_URL}/api/mcp`;
const slides = [
  { id: "what", label: "What it does" },
  { id: "watch", label: "The demo" },
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
const scenes = [
  { start: 0, end: 8, label: "Your spaces", left: <>Your people. <br />Your space.</>, leftNote: "Home. Friends. Office.", right: <>One shared list.<br />Less group-chat chaos.</>, rightNote: "Everyone’s on the same page." },
  { start: 8, end: 21, label: "Add products", left: <>Just say <br />what you need.</>, leftNote: "Yes, even “mleko bitolsko plavo”.", right: <>Same product.<br />Better price.</>, rightNote: "Review it. Then add it." },
  { start: 21, end: 30, label: "The full list", left: <>One list. <br />All of you.</>, leftNote: "Milk added. Household updated.", right: <>“Did you get it?”<br />Retired.</>, rightNote: "See the full list in your chat." },
  { start: 30, end: 40, label: "Sale alert", left: <>Your usual milk. <br />An unusual price.</>, leftNote: "A little memory goes a long way.", right: <>Bought it before?<br />Hear when it’s on sale.</>, rightNote: "Purchase-based alerts · prototype" }
] as const;
const flow = [
  { name: "MCP", note: "Connects your chat", symbol: "↔" },
  { name: "Tools", note: "Fetch store offers", symbol: "⌘" },
  { name: "Laya", note: "Open-source matching", symbol: "λ" },
  { name: "Qwen", note: "Finds unique products", symbol: "≠" },
  { name: "You", note: "Choose. Confirm. Done.", symbol: "✓" }
] as const;
const phoneCues = [[0, 1.4, 2.5, 5], [0, 1.4, 3, 9], [0, 1.2, 2.5], [0, 1, 4, 7]];

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

function Message({ children, user = false }: { children: ReactNode; user?: boolean }) {
  return <div className={`${styles.message} ${user ? styles.userMessage : styles.reply}`}>{children}</div>;
}

function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return <div className={`${styles.reveal} ${show ? styles.revealVisible : ""}`} aria-hidden={!show}><div>{children}</div></div>;
}

function Typing({ show }: { show: boolean }) {
  return <Reveal show={show}><div className={styles.typing} aria-label="Assistant is typing"><i /><i /><i /></div></Reveal>;
}

function PhoneContent({ scene, elapsed }: { scene: number; elapsed: number }) {
  if (scene === 0) return <>
    <Message user>Show my shopping spaces.</Message>
    <Reveal show={elapsed >= 1.4}><div className={styles.tool}>✓ space_list</div></Reveal>
    <Typing show={elapsed >= 1.4 && elapsed < 2.5} />
    <Reveal show={elapsed >= 2.5}><Message>Who are we shopping for?</Message><div className={styles.phoneCard}>{["Home", "Weekend away", "Office"].map((name, i) => <div className={`${styles.spaceRow} ${i === 0 && elapsed >= 5 ? styles.selectedSpace : ""}`} key={name}><span>{["⌂", "☺", "⌘"][i]}</span><div><strong>{name}</strong><small>{["You, Ana & Marko", "4 friends", "6 teammates"][i]}</small></div><b>{i === 0 && elapsed >= 5 ? "✓" : "→"}</b></div>)}</div></Reveal>
    <Reveal show={elapsed >= 5}><div className={styles.saved}>✓ Home selected</div></Reveal>
  </>;
  if (scene === 1) return <>
    <Message user>Add 2× mleko bitolsko 3.2% plavo and Zito proteinski leb 500g.</Message>
    <Reveal show={elapsed >= 1.4}><div className={styles.tool}>✓ shopping_add_item</div></Reveal>
    <Typing show={elapsed >= 1.4 && elapsed < 3} />
    <Reveal show={elapsed >= 3}><Message>Check these before I add them.</Message><div className={`${styles.phoneCard} ${styles.productCard}`}><div className={styles.cardLabel}>REVIEW · HOME</div><div className={styles.productRow}><Milk small /><div><strong>Битолско 3.2%</strong><small>1 L · check packaging</small><b>61 ден <span>at Vero</span></b></div><em>×2</em></div><div className={styles.productRow}><span className={styles.bread}>500g</span><div><strong>Протеински леб</strong><small>500 g · Zito</small><b>89 ден</b></div><em>×1</em></div><div className={elapsed >= 9 ? styles.confirmedAction : styles.visualAction}>{elapsed >= 9 ? "✓ Added to Home" : "Add 2 items"}</div></div></Reveal>
    <Reveal show={elapsed >= 9}><div className={styles.saved}>✓ Ana & Marko can see them too.</div></Reveal>
  </>;
  if (scene === 2) return <>
    <Message user>Show our full shopping list.</Message>
    <Reveal show={elapsed >= 1.2}><div className={styles.tool}>✓ shopping_list_items</div></Reveal>
    <Typing show={elapsed >= 1.2 && elapsed < 2.5} />
    <Reveal show={elapsed >= 2.5}><Message>One list. Nobody forgot the milk.</Message><div className={`${styles.phoneCard} ${styles.productCard}`}><div className={styles.cardLabel}>HOME · SHARED LIST</div><div className={styles.listItem}><span>□</span><div><strong>Битолско 3.2%</strong><small>1 L · Vero · 61 ден</small></div><b>×2</b></div><div className={styles.listItem}><span>□</span><div><strong>Протеински леб</strong><small>500 g · Zito · 89 ден</small></div><b>×1</b></div><div className={styles.total}><span>Split-store total</span><strong>211 ден</strong></div><div className={styles.listPeople}><span>You</span><span>Ana</span><span>Marko</span></div></div></Reveal>
  </>;
  return <>
    <div className={styles.nextWeek}>One week later…</div>
    <Reveal show={elapsed >= 1}><div className={`${styles.phoneCard} ${styles.notification}`}><div className={styles.cardLabel}>DENARWISE · NOW</div><h3>Your milk is on sale.</h3><p>Битолско 3.2% · 1 L · Vero</p><div className={styles.notificationPrice}><strong>54 ден</strong><del>61 ден</del></div><div className={styles.saleLabel}>Same milk. 7 ден less.</div></div></Reveal>
    <Reveal show={elapsed >= 4}><Message>Bought before. Worth a heads-up.</Message><div className={`${styles.phoneCard} ${styles.productCard}`}><div className={styles.productRow}><Milk small /><div><strong>Your usual carton</strong><small>Same 3.2% · same 1 L</small></div></div><div className={elapsed >= 7 ? styles.confirmedAction : styles.visualAction}>{elapsed >= 7 ? "✓ Back on the Home list" : "Add again · 54 ден"}</div></div></Reveal>
    <div className={styles.alertPrototype}>Sale-alert prototype</div>
  </>;
}

const PhonePanel = memo(function PhonePanel({ scene, active, cue }: { scene: number; active: boolean; cue: number }) {
  const viewport = useRef<HTMLDivElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  // Keep the outgoing scene intact while it fades, including at the loop boundary.
  const [frame, setFrame] = useState(cue);
  useLayoutEffect(() => { if (active) setFrame(cue); }, [active, cue]);
  useLayoutEffect(() => { if (active && viewport.current) viewport.current.scrollTop = 0; }, [active]);

  useEffect(() => {
    if (active) return;
    const reset = window.setTimeout(() => setFrame(0), 500);
    return () => window.clearTimeout(reset);
  }, [active]);

  useEffect(() => {
    const body = viewport.current;
    const content = transcript.current;
    if (!active || !body || !content) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animation = 0;
    let previous = 0;
    const followContent = (now: number) => {
      const target = Math.max(0, body.scrollHeight - body.clientHeight);
      const distance = target - body.scrollTop;
      const delta = previous ? Math.min(now - previous, 40) : 16;
      previous = now;
      body.scrollTop = reducedMotion.matches || Math.abs(distance) < 1 ? target : body.scrollTop + distance * (1 - Math.exp(-delta / 65));
      animation = Math.abs(target - body.scrollTop) > 1 ? requestAnimationFrame(followContent) : 0;
    };
    const observer = new ResizeObserver(() => {
      if (!animation) { previous = 0; animation = requestAnimationFrame(followContent); }
    });
    observer.observe(content);
    observer.observe(body);
    return () => { observer.disconnect(); cancelAnimationFrame(animation); };
  }, [active]);

  return <div className={styles.phoneBody} ref={viewport} data-active={active} inert={!active} aria-hidden={!active}><div className={styles.phoneTranscript} ref={transcript}><PhoneContent scene={scene} elapsed={frame} /></div></div>;
});

export function DemoExperience({ fontClassName }: { fontClassName: string }) {
  const deck = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [time, setTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fullscreenTip, setFullscreenTip] = useState(true);
  const scene = scenes.findIndex((item) => time >= item.start && time < item.end);
  const currentScene = Math.max(0, scene);
  const current = scenes[currentScene];
  const cue = phoneCues[currentScene].reduce((latest, value) => value <= time - current.start ? value : latest, 0);

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
      if (event.altKey || event.metaKey || event.ctrlKey || event.shiftKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
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

  useEffect(() => { setTime(0); setPaused(false); }, [active]);

  useEffect(() => {
    if (active !== 1 || paused) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min((now - previous) / 1000, 0.5);
      previous = now;
      if (!document.hidden) setTime((value) => (value + delta) % 40);
    }, 100);
    return () => window.clearInterval(timer);
  }, [active, paused]);

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
        <div className={styles.demoHeading}><p className={styles.kicker}>THE DEMO</p><h2 id="demo-title">You ask. It gets sorted.</h2></div>
        <div className={styles.demoStage}>
          <aside key={`left-${currentScene}`} className={`${styles.caption} ${styles.captionLeft}`}><span className={styles.sceneLabel}>0{currentScene + 1} / {current.label}</span><h3>{current.left}</h3><p>{current.leftNote}</p><div className={styles.captionArrow} aria-hidden="true">⤷</div></aside>
          <div className={styles.phone} data-paused={paused} aria-label={`Automatic mobile walkthrough: ${current.label}`}><div className={styles.phoneStatus}><span>9:41</span><div className={styles.island} /><span aria-hidden="true">▰ ▰</span></div><div className={styles.phoneHead}><span className={styles.phoneLogo}>D.</span><div><strong>DenarWise</strong><small>● Local LLM</small></div></div><div className={styles.phoneViewport}>{scenes.map((item, index) => <PhonePanel key={item.start} scene={index} active={active === 1 && currentScene === index} cue={index === currentScene ? cue : 0} />)}</div><div className={styles.composer} aria-hidden="true"><span>Ask your assistant…</span><b>↑</b></div><div className={styles.homeBar} /></div>
          <aside key={`right-${currentScene}`} className={`${styles.caption} ${styles.captionRight}`}><div className={styles.captionArrow} aria-hidden="true">⤶</div><h3>{current.right}</h3><p>{current.rightNote}</p></aside>
        </div>
        <div className={styles.demoFoot}><div className={styles.sceneProgress} aria-label={`Scene ${currentScene + 1} of 4`}>{scenes.map((item, index) => <span key={item.start}><i style={{ transform: `scaleX(${index < currentScene ? 1 : index === currentScene ? (time - item.start) / (item.end - item.start) : 0})` }} /></span>)}</div><span>Animated walkthrough · sample data</span></div>
      </section>

      <section id="how" className={`${styles.slide} ${styles.how}`} aria-labelledby="how-title" inert={active !== 2}>
        <div className={styles.howHeading}><p className={styles.kicker}>UNDER THE HOOD</p><h2 id="how-title">A chat goes in.<br /><span>A smarter list comes out.</span></h2></div>
        <ol className={styles.flow}>{flow.map((step, index) => <li key={step.name}><span className={styles.flowIcon} aria-hidden="true">{step.symbol}</span><h3>{step.name}</h3><p>{step.note}</p>{index < flow.length - 1 && <span className={styles.flowArrow} aria-hidden="true">→</span>}</li>)}</ol>
        <p className={styles.howFoot}>One product. All its prices. <strong>Your choice.</strong></p>
      </section>

      <section id="try" className={`${styles.slide} ${styles.trySlide}`} aria-labelledby="try-title" inert={active !== 3}>
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

      <section id="team" className={`${styles.slide} ${styles.team}`} aria-labelledby="team-title" inert={active !== 4}>
        <div><h2 id="team-title">TEAM:</h2><ul><li>Gorazd Filipovski</li><li>Stefan Lazarevski</li><li>Nikola Jagurinoski</li></ul></div>
      </section>
    </main>

    <footer className={styles.deckFooter}>
      <span className={styles.keyboardHint}>← → <span>or swipe</span></span>
      {active === 1 && <button className={styles.pauseButton} onClick={() => setPaused(!paused)} aria-label={paused ? "Resume demo animation" : "Pause demo animation"}>{paused ? "▶ Resume" : "Ⅱ Pause"}</button>}
      <div className={styles.slideControls}><button aria-label="Previous slide" disabled={active === 0} onClick={() => goTo(active - 1)}><Arrow back /></button><span aria-live="polite" aria-atomic="true">0{active + 1} <span>/ 0{slides.length}</span></span><button aria-label="Next slide" disabled={active === slides.length - 1} onClick={() => goTo(active + 1)}><Arrow /></button></div>
    </footer>
  </div>;
}
