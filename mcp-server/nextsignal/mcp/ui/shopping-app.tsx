import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";
import { useApp, useHostStyles } from "@modelcontextprotocol/ext-apps/react";
import type { McpUiToolResultNotification } from "@modelcontextprotocol/ext-apps";

type ShoppingItem = {
  id: string;
  spaceId: string;
  name: string;
  quantity: string;
  store: string | null;
  createdAt: string;
};

type ShoppingView = {
  view: "added" | "list";
  status?: "draft" | "saved";
  spaceId: string;
  spaces: Array<{ id: string; name: string }>;
  items: ShoppingItem[];
  stores: string[];
};

const styles = `
  :root {
    color-scheme: light dark;
    --app-bg: var(--color-background-primary, #f7f7f4);
    --card-bg: var(--color-background-secondary, rgba(255,255,255,.92));
    --text: var(--color-text-primary, #1f241f);
    --muted: var(--color-text-secondary, #697069);
    --line: var(--color-border-primary, rgba(31,36,31,.11));
    --accent: #387d52;
    --accent-strong: #28643e;
    --accent-soft: #e2f1e6;
    --danger: #b4433d;
    --danger-soft: #f9e8e6;
    --shadow: 0 14px 35px rgba(31, 46, 35, .08);
    font-family: var(--font-sans, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
  }

  * { box-sizing: border-box; }
  html, body, #root { margin: 0; min-height: 100%; }
  body { background: transparent; color: var(--text); }
  button, input, select { font: inherit; }
  button, select { -webkit-tap-highlight-color: transparent; }

  .shell {
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    padding: 10px;
  }

  .panel {
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 24px;
    background:
      radial-gradient(circle at 95% -5%, rgba(111, 185, 133, .18), transparent 34%),
      var(--app-bg);
    box-shadow: var(--shadow);
  }

  .header { padding: 22px 22px 17px; }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 8px;
    color: var(--accent-strong);
    font-size: 12px;
    font-weight: 760;
    letter-spacing: .08em;
    text-transform: uppercase;
  }
  .eyebrow-mark {
    display: grid;
    width: 29px;
    height: 29px;
    place-items: center;
    border-radius: 10px;
    background: var(--accent-soft);
  }
  h1 { margin: 0; font-size: clamp(24px, 5vw, 34px); line-height: 1.08; letter-spacing: -.035em; }
  .subhead { margin: 8px 0 0; color: var(--muted); font-size: 14px; line-height: 1.5; }

  .space-control {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 17px;
    padding: 5px 6px 5px 13px;
    border: 1px solid var(--line);
    border-radius: 15px;
    background: var(--card-bg);
  }
  .space-control label { flex: 0 0 auto; color: var(--muted); font-size: 13px; font-weight: 650; }
  .space-control select {
    min-width: 0;
    flex: 1;
    border: 0;
    border-radius: 10px;
    outline: 0;
    background: transparent;
    color: var(--text);
    padding: 8px 30px 8px 8px;
    font-weight: 720;
    cursor: pointer;
  }

  .content { padding: 0 12px 12px; }
  .items { display: grid; gap: 8px; }
  .item {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 14px;
    align-items: center;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: 17px;
    background: var(--card-bg);
    transition: border-color .18s ease, opacity .18s ease, transform .18s ease;
  }
  .item.pending { opacity: .64; }
  .item-name { overflow: hidden; font-size: 15px; font-weight: 760; line-height: 1.3; text-overflow: ellipsis; }
  .item-meta { display: flex; align-items: center; gap: 7px; margin-top: 7px; }
  .store-wrap { position: relative; min-width: 0; flex: 1; }
  .store-icon { position: absolute; top: 50%; left: 9px; color: var(--muted); transform: translateY(-50%); pointer-events: none; }
  .store-input {
    width: 100%;
    height: 34px;
    border: 1px solid transparent;
    border-radius: 10px;
    outline: 0;
    background: rgba(110, 125, 112, .08);
    color: var(--text);
    padding: 0 10px 0 29px;
    font-size: 13px;
    transition: border-color .18s, background .18s;
  }
  .store-input:focus { border-color: rgba(56,125,82,.45); background: var(--card-bg); }
  .store-input::placeholder { color: var(--muted); }

  .stepper {
    display: grid;
    grid-template-columns: 34px minmax(30px, auto) 34px;
    align-items: center;
    min-height: 38px;
    border: 1px solid var(--line);
    border-radius: 13px;
    background: rgba(110, 125, 112, .06);
  }
  .stepper button {
    display: grid;
    width: 34px;
    height: 36px;
    place-items: center;
    border: 0;
    background: transparent;
    color: var(--accent-strong);
    cursor: pointer;
    font-size: 20px;
    line-height: 1;
  }
  .stepper button:disabled { opacity: .28; cursor: default; }
  .quantity { min-width: 30px; padding: 0 3px; text-align: center; font-size: 13px; font-weight: 780; }

  .list-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 7px 10px;
    color: var(--muted);
    font-size: 13px;
  }
  .text-button { border: 0; background: transparent; color: var(--accent-strong); padding: 5px; cursor: pointer; font-weight: 700; }
  .list-item { grid-template-columns: auto minmax(0, 1fr) auto; cursor: pointer; }
  .check {
    display: grid;
    width: 22px;
    height: 22px;
    place-items: center;
    border: 1.5px solid rgba(80,91,82,.35);
    border-radius: 7px;
    background: transparent;
    color: white;
    transition: .16s ease;
  }
  .check.selected { border-color: var(--accent); background: var(--accent); transform: scale(1.03); }
  .item-store { display: inline-flex; align-items: center; gap: 5px; color: var(--muted); font-size: 12px; }
  .qty-badge { min-width: 34px; padding: 5px 8px; border-radius: 9px; background: rgba(110,125,112,.09); text-align: center; font-size: 12px; font-weight: 760; }

  .footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 17px 17px;
    border-top: 1px solid var(--line);
    background: color-mix(in srgb, var(--app-bg) 88%, transparent);
  }
  .selection-copy { color: var(--muted); font-size: 13px; }
  .clear-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 42px;
    border: 0;
    border-radius: 13px;
    background: var(--danger);
    color: #fff;
    padding: 0 16px;
    cursor: pointer;
    font-weight: 760;
    box-shadow: 0 8px 20px rgba(180,67,61,.19);
  }
  .clear-button:disabled { background: rgba(110,125,112,.17); color: var(--muted); box-shadow: none; cursor: default; }
  .action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 102px;
    min-height: 42px;
    border: 0;
    border-radius: 13px;
    background: var(--accent);
    color: #fff;
    padding: 0 19px;
    cursor: pointer;
    font-weight: 780;
    box-shadow: 0 8px 20px rgba(56,125,82,.2);
  }
  .action-button:hover:not(:disabled) { background: var(--accent-strong); }
  .action-button:disabled { background: rgba(110,125,112,.17); color: var(--muted); box-shadow: none; cursor: default; }

  .empty { padding: 34px 20px 40px; text-align: center; }
  .empty-mark { display: grid; width: 58px; height: 58px; margin: 0 auto 13px; place-items: center; border-radius: 19px; background: var(--accent-soft); color: var(--accent-strong); }
  .empty strong { display: block; margin-bottom: 5px; font-size: 17px; }
  .empty span { color: var(--muted); font-size: 13px; }

  .status { display: grid; min-height: 190px; place-items: center; padding: 30px; color: var(--muted); text-align: center; }
  .spinner { width: 26px; height: 26px; margin: 0 auto 12px; border: 2px solid var(--line); border-top-color: var(--accent); border-radius: 50%; animation: spin .8s linear infinite; }
  .error-banner { margin: 0 12px 12px; border: 1px solid rgba(180,67,61,.2); border-radius: 13px; background: var(--danger-soft); color: var(--danger); padding: 10px 13px; font-size: 13px; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (prefers-color-scheme: dark) {
    :root {
      --app-bg: var(--color-background-primary, #171b18);
      --card-bg: var(--color-background-secondary, rgba(37,43,38,.94));
      --text: var(--color-text-primary, #eef2ed);
      --muted: var(--color-text-secondary, #aab3aa);
      --line: var(--color-border-primary, rgba(238,242,237,.11));
      --accent: #75bd8b;
      --accent-strong: #8ed2a2;
      --accent-soft: rgba(74,142,94,.23);
      --danger: #d76b64;
      --danger-soft: rgba(180,67,61,.16);
      --shadow: 0 18px 42px rgba(0,0,0,.2);
    }
  }

  @media (max-width: 470px) {
    .shell { padding: 5px; }
    .panel { border-radius: 20px; }
    .header { padding: 19px 17px 14px; }
    .item { grid-template-columns: minmax(0, 1fr); gap: 10px; }
    .item > .stepper { justify-self: stretch; grid-template-columns: 38px 1fr 38px; }
    .list-item { grid-template-columns: auto minmax(0, 1fr) auto; }
    .footer { align-items: stretch; flex-direction: column; }
    .clear-button, .action-button { width: 100%; }
  }
`;

function ShoppingApp() {
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

  const receiveResult = useCallback((result: McpUiToolResultNotification["params"]) => {
    const nextView = parseShoppingView(result.structuredContent);
    if (!nextView) return;
    applyServerView(nextView);
  }, [applyServerView]);

  const { app, isConnected, error: connectionError } = useApp({
    appInfo: { name: "home-shopping", version: "1.0.0" },
    capabilities: {},
    onAppCreated: (createdApp) => {
      createdApp.ontoolresult = receiveResult;
    }
  });

  useHostStyles(app, app?.getHostContext());

  const callTool = useCallback(async (name: string, arguments_: Record<string, unknown>) => {
    if (!app) throw new Error("The shopping app is still connecting.");
    const result = await app.callServerTool({ name, arguments: arguments_ });
    if (result.isError) throw new Error(readToolError(result.content));

    const nextView = parseShoppingView(result.structuredContent);
    if (nextView) applyServerView(nextView);
    return nextView;
  }, [app, applyServerView]);

  const updateItem = useCallback((
    itemId: string,
    change: { quantity?: string; store?: string | null }
  ) => {
    setActionError(null);
    setView((current) => current?.view === "added"
      ? { ...current, items: current.items.map((item) => item.id === itemId ? { ...item, ...change } : item) }
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
      if (view.status === "draft") {
        await callTool("shopping_ui_add_items", {
          spaceId: view.spaceId,
          items: view.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            ...(item.store?.trim() ? { store: item.store.trim() } : {})
          }))
        });
      } else if (savedBaseline?.view === "added") {
        const updates = view.items.flatMap((item) => {
          const savedItem = savedBaseline.items.find((candidate) => candidate.id === item.id);
          if (!savedItem || (savedItem.quantity === item.quantity && savedItem.store === normalizedStore(item.store))) return [];
          return [{ id: item.id, quantity: item.quantity, store: normalizedStore(item.store) }];
        });
        await callTool("shopping_ui_update_items", {
          spaceId: savedBaseline.spaceId,
          itemIds: savedBaseline.items.map((item) => item.id),
          ...(view.spaceId !== savedBaseline.spaceId ? { targetSpaceId: view.spaceId } : {}),
          ...(updates.length ? { updates } : {})
        });
      }
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [callTool, savedBaseline, view]);

  const clearSelected = useCallback(async () => {
    if (!view || view.view !== "list" || selected.size === 0) return;
    const ids = [...selected];
    setActionError(null);
    setPending(new Set(ids));
    try {
      await callTool("shopping_ui_clear_items", { spaceId: view.spaceId, ids });
      setSelected(new Set());
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setPending(new Set());
    }
  }, [callTool, selected, view]);

  const dirty = view?.view === "added" && view.status === "saved" && savedBaseline?.view === "added"
    ? editableSnapshot(view) !== editableSnapshot(savedBaseline)
    : false;

  return (
    <>
      <style>{styles}</style>
      <main className="shell">
        <section className="panel">
          {!isConnected || !view ? (
            <div className="status">
              <div>
                {connectionError ? null : <div className="spinner" />}
                {connectionError ? "Could not connect the shopping view." : "Preparing your shopping list…"}
              </div>
            </div>
          ) : view.view === "added" ? (
            <AddedItems
              view={view}
              busy={saving}
              dirty={dirty}
              onMove={moveItems}
              onUpdate={updateItem}
              onSave={saveItems}
            />
          ) : (
            <ShoppingList
              view={view}
              selected={selected}
              pending={pending}
              onSelectedChange={setSelected}
              onClear={clearSelected}
            />
          )}
          {(connectionError || actionError) && (
            <div className="error-banner" role="alert">
              {actionError ?? connectionError?.message}
            </div>
          )}
        </section>
      </main>
    </>
  );
}

function AddedItems({
  view,
  busy,
  dirty,
  onMove,
  onUpdate,
  onSave
}: {
  view: ShoppingView;
  busy: boolean;
  dirty: boolean;
  onMove: (spaceId: string) => void;
  onUpdate: (itemId: string, change: { quantity?: string; store?: string | null }) => void;
  onSave: () => void;
}) {
  const isDraft = view.status === "draft";
  const itemCount = view.items.length;

  return (
    <>
      <header className="header">
        <div className="eyebrow"><span className="eyebrow-mark"><BagIcon /></span> Shopping list</div>
        <h1>{isDraft
          ? itemCount === 1 ? "Review this item" : `Review ${itemCount} items`
          : itemCount === 1 ? "Item added" : `${itemCount} items added`}</h1>
        <p className="subhead">{isDraft
          ? "Check the quantities and stores. Nothing is added until you confirm."
          : "Make any changes, then update the saved items in one go."}</p>
        <div className="space-control">
          <label htmlFor="space">{isDraft ? "Add all to" : "Save all in"}</label>
          <select id="space" value={view.spaceId} disabled={busy} onChange={(event) => onMove(event.target.value)}>
            {view.spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
          </select>
        </div>
      </header>
      <div className="content">
        <div className="items">
          {view.items.map((item) => (
            <article className={`item ${busy ? "pending" : ""}`} key={item.id}>
              <div>
                <div className="item-name">{item.name}</div>
                <div className="item-meta">
                  <StoreField
                    itemId={item.id}
                    value={item.store ?? ""}
                    stores={view.stores}
                    disabled={busy}
                    onChange={(store) => onUpdate(item.id, { store: store || null })}
                  />
                </div>
              </div>
              <QuantityStepper
                value={item.quantity}
                disabled={busy}
                onChange={(quantity) => onUpdate(item.id, { quantity })}
              />
            </article>
          ))}
        </div>
      </div>
      <footer className="footer">
        <span className="selection-copy">{isDraft
          ? "Ready when you are"
          : dirty ? "Unsaved changes" : "Everything is up to date"}</span>
        <button type="button" className="action-button" disabled={busy || (!isDraft && !dirty)} onClick={onSave}>
          {busy ? "Saving…" : isDraft ? "Add" : "Update"}
        </button>
      </footer>
    </>
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
  const numericValue = /^\d+$/.test(value.trim()) ? Number.parseInt(value, 10) : 1;
  return (
    <div className="stepper" aria-label={`Quantity ${value}`}>
      <button type="button" aria-label="Decrease quantity" disabled={disabled || numericValue <= 1} onClick={() => onChange(String(numericValue - 1))}>−</button>
      <span className="quantity">{value}</span>
      <button type="button" aria-label="Increase quantity" disabled={disabled} onClick={() => onChange(String(numericValue + 1))}>+</button>
    </div>
  );
}

function ShoppingList({
  view,
  selected,
  pending,
  onSelectedChange,
  onClear
}: {
  view: ShoppingView;
  selected: Set<string>;
  pending: Set<string>;
  onSelectedChange: (selected: Set<string>) => void;
  onClear: () => void;
}) {
  const spaceName = view.spaces.find((space) => space.id === view.spaceId)?.name ?? "Your space";
  const allSelected = view.items.length > 0 && selected.size === view.items.length;
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectedChange(next);
  };

  return (
    <>
      <header className="header">
        <div className="eyebrow"><span className="eyebrow-mark"><BagIcon /></span> {spaceName}</div>
        <h1>Shopping list</h1>
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
              <span>{view.items.length} item{view.items.length === 1 ? "" : "s"}</span>
              <button
                type="button"
                className="text-button"
                onClick={() => onSelectedChange(allSelected ? new Set() : new Set(view.items.map((item) => item.id)))}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
            <div className="items">
              {view.items.map((item) => (
                <article
                  className={`item list-item ${pending.has(item.id) ? "pending" : ""}`}
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
                  <span className={`check ${selected.has(item.id) ? "selected" : ""}`}>
                    {selected.has(item.id) && <CheckIcon />}
                  </span>
                  <div>
                    <div className="item-name">{item.name}</div>
                    <div className="item-meta">
                      <span className="item-store"><StoreIcon /> {item.store || "Any store"}</span>
                    </div>
                  </div>
                  <span className="qty-badge">× {item.quantity}</span>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
      {view.items.length > 0 && (
        <footer className="footer">
          <span className="selection-copy">{selected.size ? `${selected.size} selected` : "Choose items to clear"}</span>
          <button type="button" className="clear-button" disabled={selected.size === 0 || pending.size > 0} onClick={onClear}>
            <TrashIcon /> Clear {selected.size ? selected.size : "selected"}
          </button>
        </footer>
      )}
    </>
  );
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

function BagIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/></svg>;
}

function StoreIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 10v10h16V10"/><path d="M3 4h18l-2 6H5L3 4Z"/><path d="M9 20v-6h6v6"/></svg>;
}

function CheckIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6"/></svg>;
}

function TrashIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/></svg>;
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing shopping app root element.");
createRoot(root).render(<ShoppingApp />);
