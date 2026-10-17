import type { ShoppingView } from "./types";
import { PriceDetails, ListTotal } from "./prices";
import { CheckIcon, TrashIcon } from "./icons";
import { Eyebrow } from "./eyebrow";
import { Market } from "./market";
export function ShoppingList({
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
        <Eyebrow label={spaceName} />
        <h1>Your <em>shopping list</em></h1>
        <p className="subhead">Cheapest found for each selected product. Select items already in your basket to clear them.</p>
        <ListTotal items={view.items} />
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
                  <span className="check-box"><span className={`check ${selected.has(item.id) ? "selected" : ""}`}>
                    {selected.has(item.id) && <CheckIcon />}
                  </span></span>
                  <div>
                    <div className="item-name">{item.name}</div>
                    <div className="item-meta">
                      <span className="item-store"><Market name={item.recommendation?.offer?.market ?? item.store ?? "Any store"} /></span>
                      <PriceDetails item={item} />
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
