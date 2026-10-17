import { styles } from "./styles";
import type { ShoppingModel } from "./shopping-model";
import { ReviewItems } from "./review-items";
import { ShoppingList } from "./shopping-list";
import { Eyebrow } from "./eyebrow";

export function ShoppingPanel({ model, connected, connectionError, pendingNames, mock = false }: {
  model: ShoppingModel; connected: boolean; connectionError?: string; pendingNames?: string[]; mock?: boolean;
}) {
  const { view } = model;
  const error = model.actionError ?? connectionError;
  return <><style>{styles}</style><main className="shell"><section className="panel">
    {mock && <div className="preview-label"><span className="sample">Sample data</span></div>}
    {!connected || !view ? connectionError
      ? <div className="empty"><strong>Could not connect</strong><span>The shopping view could not reach DenarWise.</span></div>
      : <Loading names={pendingNames} />
      : view.view === "added"
        ? <ReviewItems view={view} busy={model.saving} dirty={model.dirty} retrying={model.retrying} onUpdate={model.update}
            onSearch={model.search} onSave={model.save} onMove={model.move} />
        : <ShoppingList view={view} selected={model.selected} pending={model.pending} onSelectedChange={model.setSelected} onClear={model.clear} />}
    {error && <div className="error-banner" role="alert">{error}</div>}
  </section></main></>;
}

function Loading({ names }: { names?: string[] }) {
  return <div role="status" aria-live="polite">
    <header className="header"><Eyebrow label="Shopping list" /><h1>Preparing your <em>list</em></h1>
      <p className="subhead">{names ? "Finding products in published market catalogs…" : "Connecting to DenarWise…"}</p></header>
    <div className="content"><div className="items">{(names ?? ["", ""]).map((name, index) => <div className="skeleton-row" key={index}>
      {name && <div className="sk-name">{name}</div>}<div className="sk w60" /><div className="sk w40" />
    </div>)}</div></div>
  </div>;
}
