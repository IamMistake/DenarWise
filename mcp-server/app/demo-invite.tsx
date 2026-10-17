"use client";

import { useEffect, useRef } from "react";
import { ArrowIcon } from "./site-nav";
import styles from "./demo-invite.module.css";

const DISMISSED_KEY = "denarwise:demo-invite-dismissed";

function rememberDismissal() {
  try { sessionStorage.setItem(DISMISSED_KEY, "true"); } catch { /* The popup still works when storage is unavailable. */ }
}

export function DemoInvite() {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    try { if (sessionStorage.getItem(DISMISSED_KEY)) return; } catch { /* Show the invitation without persistence. */ }
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  function dismiss() {
    rememberDismissal();
    dialog.current?.close();
  }

  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="demo-invite-title" aria-describedby="demo-invite-description" onClose={rememberDismissal} onClick={(event) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dismiss();
  }}>
    <button className={styles.close} aria-label="Close demo invitation" onClick={dismiss}>×</button>
    <span className="hs-eyebrow">A quick tour</span>
    <h2 id="demo-invite-title" className={styles.title}>Want to see DenarWise in action?</h2>
    <p id="demo-invite-description" className={styles.description}>Take a quick look at smarter shopping, shared lists, and how it all works.</p>
    <div className={styles.actions}>
      <a className="hs-btn hs-btn--lime" href="/demo" onClick={dismiss}>Take me to the demo <ArrowIcon /></a>
      <button className="hs-btn hs-btn--ghost" autoFocus onClick={dismiss}>Maybe later</button>
    </div>
  </dialog>;
}
