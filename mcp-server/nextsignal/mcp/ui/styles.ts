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

export const styles = `
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

  .notice { display: block; color: var(--muted); font-size: 12px; line-height: 1.5; overflow-wrap: anywhere; }
  .notice + .notice { margin-top: 5px; }
  .product-select { width: 100%; min-height: 46px; border: 1.5px solid var(--line); border-radius: 14px; background: var(--paper); padding: 10px; font-size: 14px; }
  .product-details { display: grid; gap: 8px; border-top: 1px solid var(--line); padding: 14px; }
  .retry { display: flex; gap: 10px; align-items: center; }
  .query-input { width: 100%; min-width: 0; min-height: 44px; border: 1.5px solid var(--line); border-radius: 14px; background: var(--paper); padding: 8px 12px; }
  .list-item .notice { flex-basis: 100%; }
  .list-item .item-name { overflow-wrap: anywhere; white-space: normal; }
  .preview-label { display: flex; justify-content: flex-end; padding: 10px 16px 0; }
  .summary { margin-top: 14px; }
`;
