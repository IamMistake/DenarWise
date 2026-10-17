"use client";

import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import styles from "./demo.module.css";

const scenes = [
  { start: 0, end: 8, label: "Your spaces", left: <>Your people. <br />Your space.</>, leftNote: "Home. Friends. Office.", right: <>One shared list.<br />Less group-chat chaos.</>, rightNote: "Everyone’s on the same page." },
  { start: 8, end: 21, label: "Add products", left: <>Just say <br />what you need.</>, leftNote: "Yes, even “mleko bitolsko plavo”.", right: <>Same product.<br />Better price.</>, rightNote: "Review it. Then add it." },
  { start: 21, end: 30, label: "The full list", left: <>One list. <br />All of you.</>, leftNote: "Milk added. Household updated.", right: <>“Did you get it?”<br />Retired.</>, rightNote: "See the full list in your chat." },
  { start: 30, end: 40, label: "Sale alert", left: <>Your usual milk. <br />An unusual price.</>, leftNote: "A little memory goes a long way.", right: <>Bought it before?<br />Hear when it’s on sale.</>, rightNote: "Purchase-based alerts · prototype" }
] as const;
const phoneCues = [[0, 1.4, 2.5, 5], [0, 1.4, 3, 9], [0, 1.2, 2.5], [0, 1, 4, 7]];

function Message({ children, user = false }: { children: ReactNode; user?: boolean }) {
  return <div className={`${styles.message} ${user ? styles.userMessage : styles.reply}`}>{children}</div>;
}

function Reveal({ show, children }: { show: boolean; children: ReactNode }) {
  return <div className={`${styles.reveal} ${show ? styles.revealVisible : ""}`} aria-hidden={!show}><div>{children}</div></div>;
}

function Typing({ show }: { show: boolean }) {
  return <Reveal show={show}><div className={styles.typing} aria-label="Assistant is typing"><i /><i /><i /></div></Reveal>;
}

function PhoneContent({ scene, elapsed, milk }: { scene: number; elapsed: number; milk: ReactNode }) {
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
    <Reveal show={elapsed >= 3}><Message>Check these before I add them.</Message><div className={`${styles.phoneCard} ${styles.productCard}`}><div className={styles.cardLabel}>REVIEW · HOME</div><div className={styles.productRow}>{milk}<div><strong>Битолско 3.2%</strong><small>1 L · check packaging</small><b>61 ден <span>at Vero</span></b></div><em>×2</em></div><div className={styles.productRow}><span className={styles.bread}>500g</span><div><strong>Протеински леб</strong><small>500 g · Zito</small><b>89 ден</b></div><em>×1</em></div><div className={elapsed >= 9 ? styles.confirmedAction : styles.visualAction}>{elapsed >= 9 ? "✓ Added to Home" : "Add 2 items"}</div></div></Reveal>
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
    <Reveal show={elapsed >= 4}><Message>Bought before. Worth a heads-up.</Message><div className={`${styles.phoneCard} ${styles.productCard}`}><div className={styles.productRow}>{milk}<div><strong>Your usual carton</strong><small>Same 3.2% · same 1 L</small></div></div><div className={elapsed >= 7 ? styles.confirmedAction : styles.visualAction}>{elapsed >= 7 ? "✓ Back on the Home list" : "Add again · 54 ден"}</div></div></Reveal>
    <div className={styles.alertPrototype}>Sale-alert prototype</div>
  </>;
}

const PhonePanel = memo(function PhonePanel({ scene, active, cue, milk }: { scene: number; active: boolean; cue: number; milk: ReactNode }) {
  const viewport = useRef<HTMLDivElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
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
  return <div className={styles.phoneBody} ref={viewport} data-active={active} inert={!active} aria-hidden={!active}><div className={styles.phoneTranscript} ref={transcript}><PhoneContent scene={scene} elapsed={frame} milk={milk} /></div></div>;
});

export function AnimatedDemo({ active, paused, milk }: { active: boolean; paused: boolean; milk: ReactNode }) {
  const [time, setTime] = useState(0);
  useEffect(() => { setTime(0); }, [active]);
  useEffect(() => {
    if (!active || paused) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min((now - previous) / 1000, 0.5);
      previous = now;
      if (!document.hidden) setTime((value) => (value + delta) % 40);
    }, 100);
    return () => window.clearInterval(timer);
  }, [active, paused]);
  const currentScene = Math.max(0, scenes.findIndex((item) => time >= item.start && time < item.end));
  const current = scenes[currentScene];
  const cue = phoneCues[currentScene].reduce((latest, value) => value <= time - current.start ? value : latest, 0);
  return <>
    <div className={styles.demoHeading}><p className={styles.kicker}>THE DEMO</p><h2 id="demo-title">You ask. It gets sorted.</h2></div>
    <div className={styles.demoStage}>
      <aside key={`left-${currentScene}`} className={`${styles.caption} ${styles.captionLeft}`}><span className={styles.sceneLabel}>0{currentScene + 1} / {current.label}</span><h3>{current.left}</h3><p>{current.leftNote}</p><div className={styles.captionArrow} aria-hidden="true">⤷</div></aside>
      <div className={styles.phone} data-paused={paused} aria-label={`Automatic mobile walkthrough: ${current.label}`}><div className={styles.phoneStatus}><span>9:41</span><div className={styles.island} /><span aria-hidden="true">▰ ▰</span></div><div className={styles.phoneHead}><span className={styles.phoneLogo}>D.</span><div><strong>DenarWise</strong><small>● Local LLM</small></div></div><div className={styles.phoneViewport}>{scenes.map((item, index) => <PhonePanel key={item.start} scene={index} active={active && currentScene === index} cue={index === currentScene ? cue : 0} milk={milk} />)}</div><div className={styles.composer} aria-hidden="true"><span>Ask your assistant…</span><b>↑</b></div><div className={styles.homeBar} /></div>
      <aside key={`right-${currentScene}`} className={`${styles.caption} ${styles.captionRight}`}><div className={styles.captionArrow} aria-hidden="true">⤶</div><h3>{current.right}</h3><p>{current.rightNote}</p></aside>
    </div>
    <div className={styles.demoFoot}><div className={styles.sceneProgress} aria-label={`Scene ${currentScene + 1} of 4`}>{scenes.map((item, index) => <span key={item.start}><i style={{ transform: `scaleX(${index < currentScene ? 1 : index === currentScene ? (time - item.start) / (item.end - item.start) : 0})` }} /></span>)}</div><span>Animated walkthrough · sample data</span></div>
  </>;
}
