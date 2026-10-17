import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import type { McpUiToolResultNotification } from "@modelcontextprotocol/ext-apps";
import {
  MARKETS,
  availablePrices,
  cheapestPrice,
  formatDenars,
  parseQuantity,
  sampleMatches,
  summarizeBasket,
  type ItemMatch,
  type UniversalProduct
} from "../../domain/price-matching";
import { marketLogos } from "./generated/market-logos";

type ShoppingItem = {
  id: string;
  spaceId: string;
  name: string;
  quantity: string;
  store: string | null;
  createdAt: string;
  /**
   * Price matching result. The server does not send this yet; it is filled from
   * sample data in preview mode and will be filled by the matching backend later.
   */
  match?: ItemMatch;
};

type ShoppingView = {
  view: "added" | "list";
  status?: "draft" | "saved";
  spaceId: string;
  spaces: Array<{ id: string; name: string }>;
  items: ShoppingItem[];
  stores: string[];
};

type ItemChange = { quantity?: string; store?: string | null; name?: string };

type CallTool = (name: string, arguments_: Record<string, unknown>, current: ShoppingView) => Promise<ShoppingView | null>;

/**
 * Flip to true once the server sends `match` data with draft items. Until then the
 * "searching markets" animation would claim work that is not happening.
 */
const MATCHING_LIVE = false;

const darkVariables = `
  --paper: var(--color-background-primary, #0e1530);
  --card: var(--color-background-secondary, #19224a);
  --ink: var(--color-text-primary, #f2f5ff);
  --muted: var(--color-text-secondary, #a9b1cf);
  --line: rgba(242, 245, 255, .14);
  --green-ink: #5fd38f;
  --mint: rgba(22, 163, 90, .2);
  --selected: rgba(198, 244, 50, .1);
  --panel: #070b1c;
  --danger: #ff8a8f;
  --edge: #000;
  --em-color: #ffd23f;
  --em-marker: 0;
  --on-danger: #141a33;
`;

const styles = `
  :root {
    color-scheme: light dark;
    --paper: var(--color-background-primary, #fbf8f1);
    --card: var(--color-background-secondary, #ffffff);
    --ink: var(--color-text-primary, #141a33);
    --muted: var(--color-text-secondary, #5a6075);
    --line: rgba(20, 26, 51, .12);
    --green: #16a35a;
    --green-ink: #0b7a41;
    --mint: #e3f6ea;
    --selected: #f1faf4;
    --navy: #141a33;
    --panel: #0e1530;
    --panel-2: #19224a;
    --lime: #c6f432;
    --tomato: #ff5a3c;
    --sun: #ffd23f;
    --danger: #c62f3a;
    --edge: #141a33;
    --em-color: inherit;
    --em-marker: 1;
    --on-danger: #fff;
    --display: "Bricolage Grotesque", ui-rounded, "SF Pro Rounded", "Segoe UI Variable Display", system-ui, sans-serif;
    --body: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-family: var(--body);
  }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { ${darkVariables} } }
  :root[data-theme="dark"] { ${darkVariables} color-scheme: dark; }

  * { box-sizing: border-box; }
  html, body, #root { margin: 0; min-height: 100%; }
  body { background: transparent; color: var(--ink); }
  button, input, select { font: inherit; color: inherit; }
  button { -webkit-tap-highlight-color: transparent; }
  :focus-visible { outline: 3px solid var(--green); outline-offset: 2px; border-radius: 10px; }

  .shell { width: 100%; max-width: 680px; margin: 0 auto; padding: 8px 8px 16px; }
  .panel { overflow: hidden; border: 2px solid var(--ink); border-radius: 26px; background: var(--paper); box-shadow: 0 5px 0 var(--edge); }

  .header { padding: 20px 20px 16px; }
  .eyebrow { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
  .eyebrow-pill { display: inline-flex; align-items: center; gap: 7px; border-radius: 999px; background: var(--mint); color: var(--green-ink); padding: 5px 12px 5px 6px; font-size: 13px; font-weight: 700; }
  .eyebrow-mark { display: grid; width: 24px; height: 24px; place-items: center; border-radius: 50%; background: var(--green); color: #fff; }
  .sample { margin-left: auto; border: 1.5px dashed currentColor; border-radius: 999px; padding: 2px 10px; color: var(--muted); font-size: 12px; font-weight: 700; }
  h1 { margin: 0; font-family: var(--display); font-size: clamp(28px, 6vw, 38px); font-weight: 800; line-height: 1.02; letter-spacing: -.035em; }
  h1 em { position: relative; z-index: 0; color: var(--em-color); font-style: normal; white-space: nowrap; }
  h1 em::after { position: absolute; z-index: -1; inset: 55% -3px 4% -3px; border-radius: 6px; background: var(--sun); content: ""; transform: rotate(-1.5deg); opacity: calc(.9 * var(--em-marker)); }
  .subhead { margin: 10px 0 0; color: var(--muted); font-size: 14px; line-height: 1.55; }

  .space-control { display: flex; align-items: center; gap: 10px; margin-top: 16px; border: 1.5px solid var(--line); border-radius: 16px; background: var(--card); padding: 0 6px 0 14px; }
  .space-control label { flex: none; color: var(--muted); font-size: 13px; font-weight: 600; }
  .space-control select { min-width: 0; min-height: 46px; flex: 1; border: 0; border-radius: 12px; background: transparent; padding: 0 8px; font-family: var(--display); font-size: 18px; font-weight: 700; cursor: pointer; }

  .content { padding: 0 12px 14px; }
  .items { display: grid; gap: 12px; }

  .card { overflow: hidden; border: 1.5px solid var(--line); border-radius: 20px; background: var(--card); animation: rise .26s ease-out both; }
  @keyframes rise { from { opacity: 0; transform: translateY(8px) scale(.99); } to { opacity: 1; transform: none; } }
  .card.pending { opacity: .6; }
  .card-top { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: start; padding: 14px; }
  .idx { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 9px; background: var(--sun); color: #141a33; font-size: 13px; font-weight: 800; }
  .query { overflow-wrap: anywhere; font-family: var(--display); font-size: 19px; font-weight: 700; line-height: 1.2; letter-spacing: -.015em; }
  .item-name { overflow: hidden; font-size: 15px; font-weight: 700; line-height: 1.3; text-overflow: ellipsis; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
  .chip { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 3px 10px; font-size: 12px; font-weight: 700; }
  .chip.matched { background: var(--mint); color: var(--green-ink); }
  .chip.choose { background: var(--tomato); color: #141a33; }
  .chip.none { border: 1.5px dashed var(--muted); color: var(--muted); }
  .chip.lock { background: var(--ink); color: var(--paper); }
  .chip .logo { height: 18px; padding: 2px; border-radius: 5px; }

  .stepper { display: grid; grid-template-columns: 44px minmax(30px, auto) 44px; align-items: center; border: 1.5px solid var(--line); border-radius: 999px; background: var(--paper); }
  .stepper button { display: grid; width: 44px; height: 42px; place-items: center; border: 0; border-radius: 999px; background: transparent; cursor: pointer; font-size: 20px; line-height: 1; }
  .stepper button:hover:not(:disabled) { background: var(--mint); color: var(--green-ink); }
  .stepper button:disabled { opacity: .3; cursor: default; }
  .quantity { min-width: 30px; text-align: center; font: 700 15px var(--mono); }

  .logo { display: inline-grid; flex: none; place-items: center; height: 30px; min-width: 30px; border-radius: 9px; background: #fff; padding: 4px; box-shadow: inset 0 0 0 1px rgba(20, 26, 51, .1); }
  .logo img { display: block; width: auto; max-width: 70px; height: 22px; object-fit: contain; }
  .chip .logo img, .item-meta .logo img, .markets li .logo img, .totals .logo img, .line-total .logo img, .price-note .logo img { max-width: 52px; height: 16px; }
  .market { display: inline-flex; align-items: center; gap: 8px; min-width: 0; font-weight: 700; }
  .market > span:last-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .options { display: grid; border-top: 1.5px solid var(--line); }
  .option + .option { border-top: 1px solid var(--line); }
  .option-main { display: grid; width: 100%; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: center; min-height: 58px; border: 0; background: transparent; padding: 10px 14px; text-align: left; cursor: pointer; }
  .option-main:hover:not(:disabled) { background: var(--selected); }
  .option-main:disabled { cursor: not-allowed; opacity: .55; }
  .radio { display: grid; width: 22px; height: 22px; place-items: center; border: 2px solid var(--muted); border-radius: 50%; transition: border-color .15s; }
  .option.selected .radio { border-color: var(--green); }
  .option.selected .radio::after { width: 10px; height: 10px; border-radius: 50%; background: var(--green); content: ""; }
  .option.selected .option-main { background: var(--selected); }
  .option-name { display: grid; gap: 2px; min-width: 0; }
  .option-name b { font-size: 14px; line-height: 1.3; overflow-wrap: anywhere; }
  .option-name span { color: var(--muted); font: 12px var(--mono); }
  .option-from { color: var(--muted); font-size: 12px; text-align: right; }
  .option-from b { display: block; color: var(--ink); font: 700 15px var(--mono); }

  .price-rows { display: grid; gap: 6px; margin: 0; padding: 4px 14px 12px; list-style: none; background: var(--selected); }
  .price-row { display: grid; width: 100%; grid-template-columns: minmax(0, 1fr) 28% 66px; align-items: center; gap: 10px; min-height: 46px; border: 1.5px solid var(--line); border-radius: 14px; background: var(--card); padding: 6px 12px 6px 6px; text-align: left; cursor: pointer; font-size: 13px; }
  .price-row:hover:not(:disabled) { border-color: var(--green); }
  .price-row:disabled { cursor: default; }
  .price-row.chosen { border-color: var(--green); box-shadow: inset 0 0 0 1px var(--green); }
  .price-row.best .bar > i { background: var(--green); }
  .store-cell { display: flex; align-items: center; gap: 6px; min-width: 0; }
  .bar { position: relative; display: block; height: 8px; border-radius: 999px; background: var(--line); }
  .bar > i { position: absolute; inset: 0 auto 0 0; border-radius: 999px; background: color-mix(in srgb, var(--ink) 35%, transparent); }
  .price { font: 700 14px var(--mono); text-align: right; white-space: nowrap; }
  .tag { display: inline-flex; border-radius: 999px; background: var(--tomato); color: #141a33; padding: 1px 7px; font-size: 11px; font-weight: 800; }
  .tick { color: var(--green-ink); font-weight: 800; }
  .more-stores { padding: 0 14px 8px; background: var(--selected); }

  .line-total { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; border-top: 1.5px solid var(--line); font-size: 13px; }
  .line-total span { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); }
  .line-total strong { font: 700 16px var(--mono); }

  .hidden-note { border-top: 1px solid var(--line); padding: 0 14px; }
  .text-button { min-height: 44px; border: 0; background: transparent; color: var(--green-ink); padding: 0; cursor: pointer; font-size: 13px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; }
  .hidden-list { margin: 0 0 12px; padding: 0 0 0 18px; color: var(--muted); font-size: 13px; line-height: 1.6; }
  .hidden-list li { text-decoration: line-through; }

  .none-box { display: grid; gap: 8px; margin: 0 14px 14px; border: 1.5px dashed var(--line); border-radius: 16px; padding: 14px; }
  .none-box strong { font-family: var(--display); font-size: 18px; font-weight: 800; }
  .none-box p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.5; }
  .none-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
  .rename-input, .store-input { width: 100%; min-height: 46px; border: 1.5px solid var(--line); border-radius: 14px; background: var(--paper); padding: 0 14px; font-size: 15px; }
  .rename-input:focus, .store-input:focus { border-color: var(--green); outline: none; box-shadow: 0 0 0 4px var(--mint); }

  .plain-row { display: grid; gap: 10px; padding: 0 14px 14px 54px; }
  .store-wrap { position: relative; min-width: 0; }
  .store-icon { position: absolute; top: 50%; left: 14px; color: var(--muted); transform: translateY(-50%); pointer-events: none; }
  .store-input { padding-left: 38px; font-size: 14px; }
  .store-input::placeholder { color: var(--muted); }
  .price-note { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin: 6px 0 0; color: var(--muted); font: 12px var(--mono); }

  .list-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 4px 10px; color: var(--muted); font-size: 13px; }
  .list-item { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 8px; align-items: center; padding: 6px 14px 6px 4px; cursor: pointer; }
  .list-item:hover { border-color: var(--green); }
  .list-item[aria-checked="true"] { border-color: var(--green); background: var(--selected); }
  .check-box { display: grid; width: 44px; height: 44px; place-items: center; }
  .check { display: grid; width: 24px; height: 24px; place-items: center; border: 2px solid var(--muted); border-radius: 8px; color: #fff; transition: transform .15s ease; }
  .check.selected { border-color: var(--green); background: var(--green); transform: scale(1.06); }
  .item-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin-top: 4px; color: var(--muted); font-size: 12px; }
  .item-meta .logo { height: 22px; min-width: 22px; padding: 2px; border-radius: 6px; }
  .item-store { display: inline-flex; align-items: center; gap: 6px; }
  .item-price { color: var(--ink); font-family: var(--mono); font-weight: 700; }
  .qty-badge { min-width: 40px; border-radius: 999px; background: var(--mint); color: var(--green-ink); padding: 4px 10px; text-align: center; font: 700 13px var(--mono); }

  .footer { position: sticky; bottom: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 12px 14px; border-top: 1.5px solid var(--line); background: var(--paper); }
  .totals { min-width: 0; flex: 1; display: grid; gap: 2px; border-radius: 18px; background: var(--panel); color: #f2f5ff; padding: 12px 16px; }
  .totals .label { color: #a9b1cf; font-size: 12px; font-weight: 600; }
  .totals strong { font-family: var(--display); font-size: 30px; font-weight: 800; line-height: 1.05; letter-spacing: -.03em; }
  .totals .compare { display: grid; gap: 4px; margin-top: 6px; font-size: 12px; color: #a9b1cf; }
  .totals .compare span { display: inline-flex; flex-wrap: wrap; align-items: center; gap: 6px; }
  .totals .compare b { color: #f2f5ff; font-family: var(--mono); }
  .totals .compare .best { color: #141a33; background: var(--lime); border-radius: 999px; padding: 3px 10px; width: fit-content; font-weight: 700; }
  .totals .compare .best b { color: #141a33; }
  .totals .logo { height: 22px; min-width: 22px; padding: 2px; border-radius: 6px; }
  .selection-copy { color: var(--muted); font-size: 14px; }
  .action-button, .clear-button { display: inline-flex; min-width: 124px; min-height: 50px; align-items: center; justify-content: center; gap: 8px; border: 2px solid #141a33; border-radius: 999px; padding: 0 22px; cursor: pointer; font-size: 15px; font-weight: 800; box-shadow: 0 4px 0 #141a33; transition: transform .12s ease, box-shadow .12s ease; }
  .action-button { background: var(--green); color: #141a33; }
  .clear-button { border-color: var(--danger); background: var(--danger); color: var(--on-danger); box-shadow: 0 4px 0 #7d1a22; }
  .action-button:hover:not(:disabled), .clear-button:hover:not(:disabled) { transform: translateY(-2px); }
  .action-button:active:not(:disabled), .clear-button:active:not(:disabled) { transform: translateY(3px); box-shadow: 0 1px 0 #141a33; }
  .action-button:disabled, .clear-button:disabled { border-color: var(--line); background: transparent; color: var(--muted); box-shadow: none; cursor: not-allowed; }

  .empty { padding: 28px 20px 40px; text-align: center; }
  .empty-mark { display: grid; width: 64px; height: 64px; margin: 0 auto 14px; place-items: center; border-radius: 20px; background: var(--lime); color: #141a33; transform: rotate(-6deg); }
  .empty strong { display: block; margin-bottom: 6px; font-family: var(--display); font-size: 26px; font-weight: 800; }
  .empty span { color: var(--muted); font-size: 14px; }

  .error-banner { display: flex; gap: 10px; align-items: flex-start; margin: 0 12px 14px; border-radius: 16px; background: color-mix(in srgb, var(--danger) 12%, var(--card)); color: var(--danger); padding: 12px 14px; font-size: 14px; font-weight: 700; line-height: 1.45; }
  .error-banner::before { flex: none; display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: var(--danger); color: #fff; content: "!"; font-size: 13px; }

  .skeleton-row { display: grid; gap: 10px; border: 1.5px solid var(--line); border-radius: 20px; background: var(--card); padding: 16px; }
  .sk { height: 12px; border-radius: 999px; background: linear-gradient(90deg, var(--line) 25%, color-mix(in srgb, var(--ink) 6%, transparent) 50%, var(--line) 75%); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }
  @keyframes shimmer { to { background-position: -200% 0; } }
  .sk.w60 { width: 60%; } .sk.w40 { width: 40%; } .sk.w80 { width: 80%; }
  .sk-name { font-family: var(--display); font-size: 18px; font-weight: 700; overflow-wrap: anywhere; }
  .markets { display: flex; flex-wrap: wrap; gap: 6px; margin: 16px 0 0; padding: 0; list-style: none; }
  .markets li { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; background: var(--card); padding: 3px 10px 3px 3px; color: var(--muted); font-size: 12px; font-weight: 700; opacity: .45; box-shadow: inset 0 0 0 1.5px var(--line); animation: market-done .4s ease forwards; animation-delay: calc(var(--i) * .3s + .3s); }
  .markets li .logo { height: 22px; min-width: 22px; padding: 2px; border-radius: 999px; }
  .markets li::after { color: var(--green-ink); content: "✓"; opacity: 0; animation: market-check .4s ease forwards; animation-delay: calc(var(--i) * .3s + .3s); }
  @keyframes market-done { to { opacity: 1; color: var(--ink); } }
  @keyframes market-check { to { opacity: 1; } }
  .status-line { display: flex; align-items: center; gap: 8px; }
  .status-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--green); animation: blink 1s ease-in-out infinite; }
  @keyframes blink { 50% { opacity: .25; transform: scale(.8); } }

  @media (max-width: 470px) {
    .shell { padding: 4px 4px 12px; }
    .panel { border-radius: 22px; }
    .header { padding: 18px 16px 14px; }
    .content { padding: 0 10px 12px; }
    .card-top { grid-template-columns: auto minmax(0, 1fr); }
    .card-top .stepper { grid-column: 1 / -1; justify-self: start; }
    .option-main { grid-template-columns: auto minmax(0, 1fr); }
    .option-from { grid-column: 2; text-align: left; }
    .price-rows, .more-stores { padding-left: 10px; padding-right: 10px; }
    .price-row { grid-template-columns: minmax(0, 1fr) auto; }
    .price-row .bar { grid-column: 1 / -1; grid-row: 2; }
    .plain-row { padding-left: 14px; }
    .footer { align-items: stretch; flex-direction: column; }
    .action-button, .clear-button { width: 100%; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .001ms !important; animation-iteration-count: 1 !important; transition-duration: .001ms !important; }
    .markets li { opacity: 1; color: var(--ink); }
    .markets li::after { opacity: 1; }
  }
`;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

function useShoppingModel(callTool: CallTool) {
  const [view, setView] = useState<ShoppingView | null>(null);
  const [savedBaseline, setSavedBaseline] = useState<ShoppingView | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const applyServerView = useCallback((nextView: ShoppingView) => {
    setView(nextView);
    if (nextView.view === "added") {
      setSavedBaseline(nextView.status === "saved" ? nextView : null);
    } else {
      setSavedBaseline(null);
      setSelected(new Set());
    }
    setActionError(null);
  }, []);

  const updateItem = useCallback((itemId: string, change: ItemChange) => {
    setActionError(null);
    setView((current) => current?.view === "added"
      ? { ...current, items: current.items.map((item) => item.id === itemId ? { ...item, ...change } : item) }
      : current);
  }, []);

  const chooseProduct = useCallback((itemId: string, productId: string) => {
    setActionError(null);
    setView((current) => current?.view === "added"
      ? {
        ...current,
        items: current.items.map((item) => {
          if (item.id !== itemId || !item.match) return item;
          const product = item.match.products.find((candidate) => candidate.id === productId);
          const best = product ? cheapestPrice(product, item.match.pinnedStore) : null;
          return { ...item, store: best?.store ?? item.store, match: { ...item.match, selectedId: productId } };
        })
      }
      : current);
  }, []);

  const moveItems = useCallback((targetSpaceId: string) => {
    setActionError(null);
    setView((current) => current?.view === "added"
      ? { ...current, spaceId: targetSpaceId, items: current.items.map((item) => ({ ...item, spaceId: targetSpaceId })) }
      : current);
  }, []);

  const saveItems = useCallback(async () => {
    if (!view || view.view !== "added") return;
    setActionError(null);
    setSaving(true);
    try {
      let next: ShoppingView | null = null;
      if (view.status === "draft") {
        next = await callTool("shopping_ui_add_items", {
          spaceId: view.spaceId,
          items: view.items.map((item) => ({
            name: savedName(item),
            quantity: item.quantity,
            ...(item.store?.trim() ? { store: item.store.trim() } : {})
          }))
        }, view);
      } else if (savedBaseline?.view === "added") {
        const updates = view.items.flatMap((item) => {
          const savedItem = savedBaseline.items.find((candidate) => candidate.id === item.id);
          if (!savedItem || (savedItem.quantity === item.quantity && savedItem.store === normalizedStore(item.store))) return [];
          return [{ id: item.id, quantity: item.quantity, store: normalizedStore(item.store) }];
        });
        next = await callTool("shopping_ui_update_items", {
          spaceId: savedBaseline.spaceId,
          itemIds: savedBaseline.items.map((item) => item.id),
          ...(view.spaceId !== savedBaseline.spaceId ? { targetSpaceId: view.spaceId } : {}),
          ...(updates.length ? { updates } : {})
        }, view);
      }
      if (next) applyServerView(next);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [applyServerView, callTool, savedBaseline, view]);

  const clearSelected = useCallback(async () => {
    if (!view || view.view !== "list" || selected.size === 0) return;
    const ids = [...selected];
    setActionError(null);
    setPending(new Set(ids));
    try {
      const next = await callTool("shopping_ui_clear_items", { spaceId: view.spaceId, ids }, view);
      if (next) applyServerView(next);
      setSelected(new Set());
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setPending(new Set());
    }
  }, [applyServerView, callTool, selected, view]);

  const dirty = view?.view === "added" && view.status === "saved" && savedBaseline?.view === "added"
    ? editableSnapshot(view) !== editableSnapshot(savedBaseline)
    : false;

  return {
    view, selected, pending, saving, actionError, dirty,
    setSelected, setActionError, applyServerView, updateItem, chooseProduct, moveItems, saveItems, clearSelected
  };
}

type Model = ReturnType<typeof useShoppingModel>;

// ---------------------------------------------------------------------------
// Host (Claude, ChatGPT)
// ---------------------------------------------------------------------------

function HostApp() {
  const [pendingNames, setPendingNames] = useState<string[] | null>(null);
  const applyRef = useRef<(view: ShoppingView) => void>(() => {});
  const callToolRef = useRef<CallTool | null>(null);

  const model = useShoppingModel(useCallback<CallTool>((name, arguments_, current) => {
    if (!callToolRef.current) throw new Error("The shopping app is still connecting.");
    return callToolRef.current(name, arguments_, current);
  }, []));
  applyRef.current = model.applyServerView;

  const receiveResult = useCallback((result: McpUiToolResultNotification["params"]) => {
    const nextView = parseShoppingView(result.structuredContent);
    if (!nextView) return;
    setPendingNames(null);
    applyRef.current(nextView);
  }, []);

  const { app, isConnected, error: connectionError } = useApp({
    appInfo: { name: "home-shopping", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (createdApp) => {
      createdApp.ontoolresult = receiveResult;
      createdApp.ontoolinput = (params) => setPendingNames(namesFromToolInput(params.arguments));
    }
  });

  callToolRef.current = async (name, arguments_) => {
    if (!app) throw new Error("The shopping app is still connecting.");
    const result = await app.callServerTool({ name, arguments: arguments_ });
    if (result.isError) throw new Error(readToolError(result.content));
    return parseShoppingView(result.structuredContent);
  };

  useHostStyles(app, app?.getHostContext());

  return (
    <Frame>
      <Panel
        model={model}
        pendingNames={pendingNames}
        connected={isConnected}
        connectionError={connectionError?.message ?? null}
        mock={false}
      />
    </Frame>
  );
}

// ---------------------------------------------------------------------------
// Preview (?mock=<state>): renders SAMPLE data without an MCP host
// ---------------------------------------------------------------------------

const mockSpaces = [
  { id: "sample-space-1", name: "Filipovski" },
  { id: "sample-space-2", name: "Dracevo" },
  { id: "sample-space-3", name: "Proba 27" }
];

function mockItem(id: string, key: keyof typeof sampleMatches, quantity: string, overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  const match = structuredClone(sampleMatches[key]);
  const product = match.products.find((candidate) => candidate.id === match.selectedId);
  const best = product ? cheapestPrice(product, match.pinnedStore) : null;
  return {
    id,
    spaceId: mockSpaces[0].id,
    name: match.query,
    quantity,
    store: best?.store ?? null,
    createdAt: "2026-10-17T09:00:00.000Z",
    match,
    ...overrides
  };
}

function mockBreadChosen() {
  const item = mockItem("sample-bread", "bread", "1");
  if (item.match) {
    item.match.selectedId = item.match.products[0].id;
    item.store = cheapestPrice(item.match.products[0])?.store ?? null;
  }
  return item;
}

function buildMock(state: string): { view: ShoppingView | null; pendingNames?: string[]; error?: string } {
  const base = { spaceId: mockSpaces[0].id, spaces: mockSpaces, stores: [...MARKETS] };
  const draft = (items: ShoppingItem[]): ShoppingView => ({ ...base, view: "added", status: "draft", items });

  switch (state) {
    case "matching":
      return { view: null, pendingNames: [sampleMatches.milk.query, sampleMatches.bread.query, sampleMatches.yogurt.query] };
    case "ready":
      return { view: draft([mockItem("sample-milk", "milk", "2"), mockBreadChosen(), mockItem("sample-yogurt", "yogurt", "1")]) };
    case "saved":
      return { view: { ...base, view: "added", status: "saved", items: [mockItem("sample-milk", "milk", "2"), mockBreadChosen(), mockItem("sample-yogurt", "yogurt", "1")] } };
    case "list":
      return {
        view: {
          ...base,
          view: "list",
          items: [mockItem("sample-milk", "milk", "2"), mockBreadChosen(), mockItem("sample-yogurt", "yogurt", "1"), { id: "sample-bananas", spaceId: mockSpaces[0].id, name: "Банани", quantity: "7", store: null, createdAt: "2026-10-17T09:00:00.000Z" }]
        }
      };
    case "empty":
      return { view: { ...base, view: "list", items: [] } };
    case "error":
      return { view: draft([mockItem("sample-milk", "milk", "2"), mockBreadChosen()]), error: "Could not reach the server. Your items were not added. Try again." };
    case "compare":
    default:
      return {
        view: draft([
          mockItem("sample-milk", "milk", "2"),
          mockItem("sample-bread", "bread", "1"),
          mockItem("sample-yogurt", "yogurt", "1"),
          mockItem("sample-kefir", "kefir", "1")
        ])
      };
  }
}

const mockCallTool: CallTool = async (name, arguments_, current) => {
  await new Promise((resolve) => setTimeout(resolve, 600));
  if (name === "shopping_ui_add_items") return { ...current, view: "added", status: "saved" };
  if (name === "shopping_ui_update_items") return { ...current, view: "added", status: "saved" };
  if (name === "shopping_ui_clear_items") {
    const ids = new Set(arguments_.ids as string[]);
    return { ...current, view: "list", items: current.items.filter((item) => !ids.has(item.id)) };
  }
  return null;
};

function PreviewApp({ state }: { state: string }) {
  const model = useShoppingModel(mockCallTool);
  const mock = buildMock(state);
  const { applyServerView, setActionError } = model;

  useEffect(() => {
    const next = buildMock(state);
    if (next.view) applyServerView(next.view);
    if (next.error) setActionError(next.error);
  }, [applyServerView, setActionError, state]);

  return (
    <Frame>
      <Panel model={model} pendingNames={mock.pendingNames ?? null} connected mock />
    </Frame>
  );
}

function Frame({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{styles}</style>
      <main className="shell">
        <section className="panel">{children}</section>
      </main>
    </>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

function Panel({
  model,
  pendingNames,
  connected,
  connectionError,
  mock
}: {
  model: Model;
  pendingNames: string[] | null;
  connected: boolean;
  connectionError?: string | null;
  mock: boolean;
}) {
  const { view } = model;
  const error = model.actionError ?? connectionError ?? null;

  return (
    <>
      {!connected || !view ? (
        connectionError
          ? <div className="empty"><strong>Could not connect</strong><span>The shopping view could not reach DenarWise.</span></div>
          : <Loading names={pendingNames} mock={mock} />
      ) : view.view === "added" ? (
        <AddedItems model={model} view={view} mock={mock} />
      ) : (
        <ShoppingList model={model} view={view} mock={mock} />
      )}
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
    </>
  );
}

function Eyebrow({ label, mock }: { label: string; mock: boolean }) {
  return (
    <div className="eyebrow">
      <span className="eyebrow-pill"><span className="eyebrow-mark"><BagIcon /></span>{label}</span>
      {mock ? <span className="sample">Sample data</span> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading / matching
// ---------------------------------------------------------------------------

const matchingMessages = [
  "Searching 9 markets…",
  "Grouping the same product across stores…",
  "Checking that each result really matches…"
];

function Loading({ names, mock }: { names: string[] | null; mock: boolean }) {
  const matching = Boolean(names) && (mock || MATCHING_LIVE);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!matching) return;
    const timer = setInterval(() => setStep((current) => (current + 1) % matchingMessages.length), 1600);
    return () => clearInterval(timer);
  }, [matching]);

  if (!matching) {
    return (
      <div role="status" aria-label="Preparing your shopping list">
        <header className="header">
          <Eyebrow label="Shopping list" mock={false} />
          <h1>Preparing your <em>list</em></h1>
        </header>
        <div className="content">
          <div className="items">
            <div className="skeleton-row"><div className="sk w60" /><div className="sk w40" /></div>
            <div className="skeleton-row"><div className="sk w80" /><div className="sk w40" /></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite">
      <header className="header">
        <Eyebrow label="Price check" mock={mock} />
        <h1>Finding your <em>best prices</em></h1>
        <p className="subhead status-line"><span className="status-dot" aria-hidden="true" />{matchingMessages[step]}</p>
      </header>
      <div className="content">
        <div className="items">
          {(names ?? []).map((name) => (
            <div className="skeleton-row" key={name}>
              <div className="sk-name">{name}</div>
              <div className="sk w60" />
              <div className="sk w40" />
            </div>
          ))}
        </div>
        <ul className="markets" aria-label="Markets being searched">
          {MARKETS.map((market, index) => <li key={market} style={{ ["--i" as string]: index }}><MarketLogo market={market} />{market}</li>)}
        </ul>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review / compare / saved
// ---------------------------------------------------------------------------

function AddedItems({ model, view, mock }: { model: Model; view: ShoppingView; mock: boolean }) {
  const { saving: busy, dirty, updateItem, chooseProduct, moveItems, saveItems } = model;
  const isDraft = view.status === "draft";
  const itemCount = view.items.length;
  const hasMatches = view.items.some((item) => item.match);
  const unresolved = view.items.filter((item) => !isResolved(item)).length;
  const summary = summarizeItems(view.items);

  return (
    <>
      <header className="header">
        <Eyebrow label="Shopping list" mock={mock} />
        <h1>
          {isDraft
            ? hasMatches
              ? <>Pick the <em>best price</em></>
              : itemCount === 1 ? <>Review <em>this item</em></> : <>Review <em>{itemCount} items</em></>
            : itemCount === 1 ? <><em>Item</em> added</> : <><em>{itemCount} items</em> added</>}
        </h1>
        <p className="subhead">
          {isDraft
            ? hasMatches
              ? "We matched each item to real products. Choose the right one and where to buy it. Nothing is added until you confirm."
              : "Check the quantities and stores. Nothing is added until you confirm."
            : "Make any changes, then update the saved items in one go."}
        </p>
        <div className="space-control">
          <label htmlFor="space">{isDraft ? "Add all to" : "Save all in"}</label>
          <select id="space" value={view.spaceId} disabled={busy} onChange={(event) => moveItems(event.target.value)}>
            {view.spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
          </select>
        </div>
      </header>

      <div className="content">
        <div className="items">
          {view.items.map((item, index) => isDraft && item.match ? (
            <MatchedItem key={item.id} item={item} index={index} busy={busy} onUpdate={updateItem} onChoose={chooseProduct} />
          ) : (
            <PlainItem key={item.id} item={item} index={index} busy={busy} saved={!isDraft} stores={view.stores} onUpdate={updateItem} />
          ))}
        </div>
      </div>

      <footer className="footer">
        {isDraft && summary.lines > 0 ? (
          <div className="totals">
            <span className="label">Your basket</span>
            <strong>{formatDenars(summary.picks)}</strong>
            <div className="compare">
              {summary.basket.singleStore ? <span>One store <MarketLogo market={summary.basket.singleStore.store} /> {summary.basket.singleStore.store}: <b>{formatDenars(summary.basket.singleStore.total)}</b></span> : null}
              <span className="best">Split across {summary.basket.splitStores.length} {summary.basket.splitStores.length === 1 ? "store" : "stores"}: <b>{formatDenars(summary.basket.splitTotal)}</b></span>
            </div>
          </div>
        ) : (
          <span className="selection-copy">{isDraft
            ? "Ready when you are"
            : dirty ? "Unsaved changes" : "Everything is up to date"}</span>
        )}
        <button
          type="button"
          className="action-button"
          disabled={busy || unresolved > 0 || (!isDraft && !dirty)}
          onClick={saveItems}
        >
          {busy ? "Saving…" : unresolved > 0 ? `Choose ${unresolved} more` : isDraft ? `Add ${itemCount === 1 ? "item" : `${itemCount} items`}` : "Update"}
        </button>
      </footer>
    </>
  );
}

function MatchedItem({
  item,
  index,
  busy,
  onUpdate,
  onChoose
}: {
  item: ShoppingItem;
  index: number;
  busy: boolean;
  onUpdate: (itemId: string, change: ItemChange) => void;
  onChoose: (itemId: string, productId: string) => void;
}) {
  const match = item.match as ItemMatch;
  const [showHidden, setShowHidden] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const state = match.status === "none" ? "none" : match.selectedId ? "matched" : "choose";
  const stateLabel = state === "matched" ? "Matched" : state === "choose" ? "Choose one" : "No match";
  const selectedProduct = match.products.find((product) => product.id === match.selectedId);
  const selectedPrice = selectedProduct ? priceAt(selectedProduct, item.store, match.pinnedStore) : null;
  const quantity = parseQuantity(item.quantity);

  return (
    <article className={`card ${busy ? "pending" : ""}`}>
      <div className="card-top">
        <span className="idx">{index + 1}</span>
        <div>
          <div className="query">{match.query}</div>
          <div className="chips">
            {match.pinnedStore ? <span className="chip lock"><LockIcon /> <MarketLogo market={match.pinnedStore} /> {match.pinnedStore} only</span> : null}
            <span className={`chip ${state}`}>{stateLabel}</span>
          </div>
        </div>
        <QuantityStepper value={item.quantity} disabled={busy} onChange={(value) => onUpdate(item.id, { quantity: value })} />
      </div>

      {state === "none" ? (
        <div className="none-box">
          <strong>No match found</strong>
          <p>We checked {MARKETS.length} markets and filtered {match.hiddenCount} results. None looked like “{match.query}”.</p>
          <div className="none-actions">
            <span className="chip none">Will be added as a plain item</span>
            <button type="button" className="text-button" onClick={() => setRenaming((current) => !current)}>
              {renaming ? "Done" : "Rename item"}
            </button>
          </div>
          {renaming ? (
            <input
              className="rename-input"
              aria-label="Item name"
              value={item.name}
              disabled={busy}
              onChange={(event) => onUpdate(item.id, { name: event.target.value })}
            />
          ) : null}
        </div>
      ) : (
        <div className="options" role="radiogroup" aria-label={`Products matching ${match.query}`}>
          {match.products.map((product) => (
            <ProductOption
              key={product.id}
              product={product}
              pinnedStore={match.pinnedStore}
              selected={match.selectedId === product.id}
              chosenStore={item.store}
              busy={busy}
              onChoose={() => onChoose(item.id, product.id)}
              onStore={(store) => onUpdate(item.id, { store })}
            />
          ))}
        </div>
      )}

      {selectedProduct && selectedPrice ? (
        <div className="line-total">
          <span>{quantity} × {formatDenars(selectedPrice.price)} at <Market market={selectedPrice.store} /></span>
          <strong>{formatDenars(selectedPrice.price * quantity)}</strong>
        </div>
      ) : null}

      {match.hiddenCount > 0 ? (
        <div className="hidden-note">
          <button type="button" className="text-button" aria-expanded={showHidden} onClick={() => setShowHidden((current) => !current)}>
            {match.hiddenCount} unrelated results hidden · {showHidden ? "Hide" : "Show"}
          </button>
          {showHidden ? (
            <ul className="hidden-list">
              {match.hiddenSamples.map((name) => <li key={name}>{name}</li>)}
              {match.hiddenCount > match.hiddenSamples.length ? <li style={{ textDecoration: "none" }}>…and {match.hiddenCount - match.hiddenSamples.length} more</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function ProductOption({
  product,
  pinnedStore,
  selected,
  chosenStore,
  busy,
  onChoose,
  onStore
}: {
  product: UniversalProduct;
  pinnedStore?: string;
  selected: boolean;
  chosenStore: string | null;
  busy: boolean;
  onChoose: () => void;
  onStore: (store: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const prices = availablePrices(product, pinnedStore);
  const soldHere = prices.length > 0;
  const visible = showAll ? prices : prices.slice(0, 4);
  const max = Math.max(...prices.map((entry) => entry.price), 1);

  return (
    <div className={`option ${selected ? "selected" : ""}`}>
      <button type="button" className="option-main" role="radio" aria-checked={selected} disabled={busy || !soldHere} onClick={onChoose}>
        <span className="radio" aria-hidden="true" />
        <span className="option-name"><b>{product.name}</b><span>{product.size}</span></span>
        <span className="option-from">
          {soldHere ? <>from<b>{formatDenars(prices[0].price)}</b></> : `Not sold at ${pinnedStore}`}
        </span>
      </button>
      {selected && soldHere ? (
        <>
          <ul className="price-rows" aria-label={`Prices for ${product.name}`}>
            {visible.map((entry, index) => (
              <li key={entry.store}>
                <button
                  type="button"
                  className={`price-row ${index === 0 ? "best" : ""} ${chosenStore === entry.store ? "chosen" : ""}`}
                  aria-pressed={chosenStore === entry.store}
                  disabled={busy || prices.length === 1}
                  onClick={() => onStore(entry.store)}
                >
                  <span className="store-cell"><Market market={entry.store} />{chosenStore === entry.store ? <span className="tick" aria-label="selected">✓</span> : null}{index === 0 ? <span className="tag">Cheapest</span> : null}</span>
                  <span className="bar" aria-hidden="true"><i style={{ width: `${Math.round((entry.price / max) * 100)}%` }} /></span>
                  <span className="price">{formatDenars(entry.price)}</span>
                </button>
              </li>
            ))}
          </ul>
          {prices.length > 4 ? (
            <div className="more-stores">
              <button type="button" className="text-button" aria-expanded={showAll} onClick={() => setShowAll((current) => !current)}>
                {showAll ? "Show fewer stores" : `Show all ${prices.length} stores`}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function PlainItem({
  item,
  index,
  busy,
  saved,
  stores,
  onUpdate
}: {
  item: ShoppingItem;
  index: number;
  busy: boolean;
  saved: boolean;
  stores: string[];
  onUpdate: (itemId: string, change: ItemChange) => void;
}) {
  const product = item.match?.products.find((candidate) => candidate.id === item.match?.selectedId);
  const price = product && item.match ? priceAt(product, item.store, item.match.pinnedStore) : null;
  const quantity = parseQuantity(item.quantity);

  return (
    <article className={`card ${busy ? "pending" : ""}`}>
      <div className="card-top">
        <span className="idx">{index + 1}</span>
        <div>
          <div className="item-name">{product ? `${product.name} ${product.size}` : item.name}</div>
          {saved && price ? <p className="price-note">{quantity} × {formatDenars(price.price)} at <Market market={price.store} /> = {formatDenars(price.price * quantity)}</p> : null}
        </div>
        <QuantityStepper value={item.quantity} disabled={busy} onChange={(value) => onUpdate(item.id, { quantity: value })} />
      </div>
      <div className="plain-row">
        <StoreField
          itemId={item.id}
          value={item.store ?? ""}
          stores={stores}
          disabled={busy}
          onChange={(store) => onUpdate(item.id, { store: store || null })}
        />
      </div>
    </article>
  );
}

function StoreField({
  itemId,
  value,
  stores,
  disabled,
  onChange
}: {
  itemId: string;
  value: string;
  stores: string[];
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  const listId = `stores-${itemId}`;

  return (
    <div className="store-wrap">
      <span className="store-icon"><StoreIcon /></span>
      <input
        className="store-input"
        aria-label="Place to buy"
        list={listId}
        value={value}
        disabled={disabled}
        placeholder="Any store"
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id={listId}>
        {stores.map((store) => <option value={store} key={store} />)}
      </datalist>
    </div>
  );
}

function QuantityStepper({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (value: string) => void }) {
  const numericValue = parseQuantity(value);
  return (
    <div className="stepper" role="group" aria-label={`Quantity ${value}`}>
      <button type="button" aria-label="Decrease quantity" disabled={disabled || numericValue <= 1} onClick={() => onChange(String(numericValue - 1))}>−</button>
      <span className="quantity" aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={disabled} onClick={() => onChange(String(numericValue + 1))}>+</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

function ShoppingList({ model, view, mock }: { model: Model; view: ShoppingView; mock: boolean }) {
  const { selected, pending, setSelected, clearSelected } = model;
  const spaceName = view.spaces.find((space) => space.id === view.spaceId)?.name ?? "Your space";
  const allSelected = view.items.length > 0 && selected.size === view.items.length;
  const summary = summarizeItems(view.items);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <>
      <header className="header">
        <Eyebrow label={spaceName} mock={mock} />
        <h1>Shopping <em>list</em></h1>
        <p className="subhead">Select what’s already in the basket, then clear it in one go.</p>
      </header>
      <div className="content">
        {view.items.length === 0 ? (
          <div className="empty">
            <div className="empty-mark"><CheckIcon /></div>
            <strong>All clear</strong>
            <span>There’s nothing left to pick up.</span>
          </div>
        ) : (
          <>
            <div className="list-toolbar">
              <span>
                {view.items.length} item{view.items.length === 1 ? "" : "s"}
                {summary.lines > 0 ? <> · about <b style={{ fontFamily: "var(--mono)", color: "var(--ink)" }}>{formatDenars(summary.picks)}</b></> : null}
              </span>
              <button
                type="button"
                className="text-button"
                onClick={() => setSelected(allSelected ? new Set() : new Set(view.items.map((item) => item.id)))}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="items" role="group" aria-label="Shopping items">
              {view.items.map((item) => {
                const product = item.match?.products.find((candidate) => candidate.id === item.match?.selectedId);
                const price = product && item.match ? priceAt(product, item.store, item.match.pinnedStore) : null;
                return (
                  <article
                    className={`card list-item ${pending.has(item.id) ? "pending" : ""}`}
                    key={item.id}
                    role="checkbox"
                    aria-checked={selected.has(item.id)}
                    tabIndex={0}
                    onClick={() => toggle(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggle(item.id);
                      }
                    }}
                  >
                    <span className="check-box">
                      <span className={`check ${selected.has(item.id) ? "selected" : ""}`}>
                        {selected.has(item.id) && <CheckIcon />}
                      </span>
                    </span>
                    <div>
                      <div className="item-name">{product ? `${product.name} ${product.size}` : item.name}</div>
                      <div className="item-meta">
                        <span className="item-store">{item.store && marketLogos[item.store] ? <MarketLogo market={item.store} /> : <StoreIcon />} {item.store || "Any store"}</span>
                        {price ? <span className="item-price">{formatDenars(price.price)}</span> : null}
                      </div>
                    </div>
                    <span className="qty-badge">× {item.quantity}</span>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </div>
      {view.items.length > 0 && (
        <footer className="footer">
          <span className="selection-copy">{selected.size ? `${selected.size} selected` : "Choose items to clear"}</span>
          <button type="button" className="clear-button" disabled={selected.size === 0 || pending.size > 0} onClick={clearSelected}>
            <TrashIcon /> Clear {selected.size ? selected.size : "selected"}
          </button>
        </footer>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isResolved(item: ShoppingItem) {
  return !item.match || item.match.status === "none" || item.match.selectedId !== null;
}

function priceAt(product: UniversalProduct, store: string | null, pinnedStore?: string) {
  const prices = availablePrices(product, pinnedStore);
  return prices.find((entry) => entry.store === store) ?? prices[0] ?? null;
}

function summarizeItems(items: ShoppingItem[]) {
  const lines = items.flatMap((item) => {
    const product = item.match?.products.find((candidate) => candidate.id === item.match?.selectedId);
    return product && item.match ? [{ item, product, pinnedStore: item.match.pinnedStore }] : [];
  });
  const picks = lines.reduce((sum, line) => {
    const price = priceAt(line.product, line.item.store, line.pinnedStore);
    return sum + (price ? price.price * parseQuantity(line.item.quantity) : 0);
  }, 0);
  const basket = summarizeBasket(lines.map((line) => ({
    quantity: parseQuantity(line.item.quantity),
    product: line.product,
    pinnedStore: line.pinnedStore
  })));
  return { lines: lines.length, picks, basket };
}

function savedName(item: ShoppingItem) {
  const product = item.match?.products.find((candidate) => candidate.id === item.match?.selectedId);
  return product ? `${product.name} ${product.size}` : item.name;
}

function namesFromToolInput(input: Record<string, unknown> | undefined) {
  if (!input) return null;
  const items = Array.isArray(input.items)
    ? input.items.flatMap((entry) => entry && typeof entry === "object" && typeof (entry as { name?: unknown }).name === "string" ? [(entry as { name: string }).name] : [])
    : [];
  if (items.length) return items;
  return typeof input.name === "string" ? [input.name] : null;
}

function parseShoppingView(value: unknown): ShoppingView | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<ShoppingView>;
  if ((candidate.view !== "added" && candidate.view !== "list") || typeof candidate.spaceId !== "string") return null;
  if (!Array.isArray(candidate.items) || !Array.isArray(candidate.spaces) || !Array.isArray(candidate.stores)) return null;
  if (candidate.view === "added" && candidate.status !== "draft" && candidate.status !== "saved") return null;
  return candidate as ShoppingView;
}

function normalizedStore(store: string | null) {
  return store?.trim() || null;
}

function editableSnapshot(view: ShoppingView) {
  return JSON.stringify({
    spaceId: view.spaceId,
    items: view.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      store: normalizedStore(item.store)
    }))
  });
}

function readToolError(content: Array<{ type: string; text?: string }>) {
  return content.find((item) => item.type === "text")?.text ?? "The shopping list could not be updated.";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The shopping list could not be updated.";
}

function MarketLogo({ market }: { market: string }) {
  const src = marketLogos[market];
  if (!src) return null;
  return <span className="logo" aria-hidden="true"><img src={src} alt="" /></span>;
}

function Market({ market }: { market: string }) {
  return <span className="market"><MarketLogo market={market} /><span>{market}</span></span>;
}

function BagIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>;
}

function StoreIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 10v10h16V10"/><path d="M3 4h18l-2 6H5L3 4Z"/><path d="M9 20v-6h6v6"/></svg>;
}

function LockIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><rect x="5" y="11" width="14" height="9"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>;
}

function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6"/></svg>;
}

function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/></svg>;
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing shopping app root element.");

const query = new URLSearchParams(window.location.search);
const mockState = query.get("mock");
const theme = query.get("theme");
if (mockState && (theme === "dark" || theme === "light")) document.documentElement.dataset.theme = theme;

createRoot(root).render(mockState ? <PreviewApp state={mockState} /> : <HostApp />);
