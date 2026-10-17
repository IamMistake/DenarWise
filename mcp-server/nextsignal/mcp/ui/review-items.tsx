import type { ShoppingUiItem, ShoppingView } from "./types";
import { Eyebrow } from "./eyebrow";
import { QuantityStepper, StoreField } from "./controls";
import { PriceDetails } from "./prices";
export type ItemChange = Partial<Pick<ShoppingUiItem, "quantity" | "requestedStore" | "productId" | "selection">>;
export function ReviewItems({ view, busy, dirty, retrying, onMove, onUpdate, onSearch, onSave }: {
  view: ShoppingView; busy: boolean; dirty: boolean; retrying: Set<string>;
  onMove: (id: string) => void; onUpdate: (id: string, change: ItemChange) => void;
  onSearch: (id: string, query: string) => void; onSave: () => void;
}) {
  const draft = view.status === "draft";
  const active = view.items.filter((i) => i.selection !== "skip");
  const ready = active.length > 0 && active.every((i) => Boolean(i.productId) || i.selection === "manual" || (!draft && !i.matching));
  return <>
    <header className="header">
      <Eyebrow label="Shopping list" />
      <h1>{draft ? <>Review <em>{view.items.length} item{view.items.length === 1 ? "" : "s"}</em></> : <><em>Items</em> added</>}</h1>
      <p className="subhead">{draft ? "Choose the real products you meant. Nothing is added until you confirm." : "Review changes, then update your saved items."}</p>
      <div className="space-control"><label htmlFor="space">{draft ? "Add all to" : "Save all in"}</label>
        <select id="space" value={view.spaceId} disabled={busy} onChange={(e) => onMove(e.target.value)}>{view.spaces.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </div>
    </header>
    <div className="content"><div className="items">{view.items.map((item, index) => <ReviewRow index={index} key={item.id} item={item} stores={view.stores}
      busy={busy || retrying.has(item.id)} draft={draft} onUpdate={(change) => onUpdate(item.id, change)} onSearch={(query) => onSearch(item.id, query)} />)}</div></div>
    <footer className="footer"><span className="selection-copy">{draft ? ready ? `${active.length} ready to add` : "Choose a product or keep each item manually" : dirty ? "Unsaved changes" : "Everything is up to date"}</span>
      <button className="action-button" type="button" disabled={busy || retrying.size > 0 || !ready || (!draft && !dirty)} onClick={onSave}>{busy ? "Saving…" : draft ? "Add" : "Update"}</button>
    </footer>
  </>;
}
function ReviewRow({ index, item, stores, busy, draft, onUpdate, onSearch }: { index: number; item: ShoppingUiItem; stores: string[]; busy: boolean; draft: boolean; onUpdate: (change: ItemChange) => void; onSearch: (query: string) => void }) {
  const choice = item.matching?.choices.find((c) => c.product.id === item.productId);
  const select = (value: string) => onUpdate(value === "manual" || value === "skip" ? { selection: value, productId: null } : { selection: undefined, productId: value || null });
  return <article className={`card ${busy ? "pending" : ""}`}>
    <div className="card-top"><span className="idx">{index + 1}</span><div>
      <div className="query">{item.originalQuery ?? item.name}</div>
      <div className="chips"><span className={`chip ${item.productId ? "matched" : "choose"}`}>{item.selection === "manual" ? "Manual item" : item.selection === "skip" ? "Skipped" : item.productId ? "Selected" : "Choose one"}</span>
        {item.requestedStore && <span className="chip lock">Only {item.requestedStore}</span>}</div>
    </div><QuantityStepper value={item.quantity} disabled={busy} onChange={(quantity) => onUpdate({ quantity })} /></div>
    <div className="product-details">
    <select className="product-select" aria-label={`Product for ${item.originalQuery ?? item.name}`} disabled={busy} value={item.selection ?? item.productId ?? (!draft && !item.matching ? "manual" : "")} onChange={(e) => select(e.target.value)}>
      <option value="">Choose a product…</option>
      {item.productId && !choice && <option value={item.productId}>{item.name}</option>}
      {item.matching?.choices.map((c) => <option key={c.product.id} value={c.product.id}>{c.product.name} · {c.kind === "alternative" ? "SIZE ALTERNATIVE" : c.kind === "possible" ? "CHECK DETAILS" : "match"} · {c.marketCount} market(s){c.cheapestPrice !== null ? ` · from ${c.cheapestPrice} MKD` : " · unavailable"}</option>)}
      <option value="manual">Keep as manual item (no price)</option>
      {draft && <option value="skip">Skip this item</option>}
    </select>
    {choice && <div className="notice">{packageDetails(choice.product.attributes)} · {choice.kind === "alternative" ? "Size alternative — check before adding" : choice.kind === "possible" ? "Possible match — check details" : "Product match"}</div>}
    {choice?.warnings.map((warning) => <div className="notice" key={warning}>{warning}</div>)}
    {item.matching?.warnings.map((warning) => <div className="notice" key={warning}>{warning}</div>)}
    <div className="item-meta"><StoreField itemId={item.id} value={item.requestedStore ?? ""} stores={stores} disabled={busy} onChange={(store) => onUpdate({ requestedStore: store || null })} /></div>
    <div className="notice">A specified supermarket is a strict restriction.</div>
    {!draft && <PriceDetails item={item} />}
    <form className="retry" onSubmit={(e) => { e.preventDefault(); const form = new FormData(e.currentTarget); onSearch(String(form.get("query") ?? "")); }}>
      <input className="query-input" name="query" aria-label="Refine product search" defaultValue={item.originalQuery ?? item.name} required maxLength={500} disabled={busy} />
      <button className="text-button" type="submit" disabled={busy}>{busy ? "Finding…" : "Find"}</button>
    </form>
  </div></article>;
}

function packageDetails(attributes: import("@/nextsignal/catalog/types").ProductAttributes) {
  return [attributes.size !== null ? `${attributes.size} ${attributes.unit ?? ""}` : "Size unknown",
    attributes.packCount !== null ? `${attributes.packCount} per pack` : "Pack count unknown",
    attributes.fatPercent !== null ? `${attributes.fatPercent}% fat` : null, attributes.variant].filter(Boolean).join(" · ");
}
