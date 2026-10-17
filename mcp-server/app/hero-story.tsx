import { MarketChip, MarketLogo } from "./market-logo";
import {
  availablePrices,
  formatDenars,
  sampleBasket,
  summarizeBasket
} from "@/nextsignal/domain/price-matching";

/** SAMPLE-labelled walkthrough: ask the AI, compare market prices, see the basket total. */
export function HeroStory() {
  const product = sampleBasket.lines[0].product;
  const rows = availablePrices(product).slice(0, 4);
  const max = Math.max(...rows.map((row) => row.price));
  const basket = summarizeBasket(sampleBasket.lines);

  return (
    <div className="hs-demo" aria-label="Example: asking an AI to add milk and bread, then comparing market prices">
      <div className="hs-bubble">
        <small>You → Claude</small>
        Add 2× Mleko 3.2% bitolsko plavo and Zito leb proteinski 500g to Home.
      </div>

      <span className="hs-sticker hs-sticker--tomato" aria-hidden="true">Cheapest at {rows[0].store}!</span>

      <div className="hs-price-card">
        <div className="hs-price-head">
          <div>
            <h3>{product.name}</h3>
            <p>{product.size} · found in {product.prices.length} markets</p>
          </div>
          <span className="hs-sample">Sample data</span>
        </div>
        <ul className="hs-rows">
          {rows.map((row, index) => (
            <li className={`hs-row ${index === 0 ? "is-best" : ""}`} key={row.store}>
              <MarketChip market={row.store} size={22} />
              <span className="hs-bar" aria-hidden="true"><i style={{ width: `${Math.round((row.price / max) * 100)}%` }} /></span>
              <span className="price hs-num">{formatDenars(row.price)}</span>
            </li>
          ))}
        </ul>
        <div className="hs-save">
          <div>
            <small>
              One store
              {basket.singleStore ? <span className="hs-market-logo" style={{ height: 24, padding: 3, borderRadius: 7 }}><MarketLogo market={basket.singleStore.store} size={16} /></span> : null}
            </small>
            <strong>{basket.singleStore ? formatDenars(basket.singleStore.total) : "—"}</strong>
          </div>
          <div className="is-best">
            <small>Split across {basket.splitStores.length} stores</small>
            <strong>{formatDenars(basket.splitTotal)}</strong>
          </div>
        </div>
      </div>

      <div className="hs-reply">
        <small>Claude</small>
        Found both. Confirm to add them to your shared list. Nothing is saved until you do.
      </div>
    </div>
  );
}
