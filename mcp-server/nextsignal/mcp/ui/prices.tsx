import type { ShoppingItem } from "@/nextsignal/domain/home";
const money = (amount: number) => new Intl.NumberFormat("mk-MK", { style: "currency", currency: "MKD", maximumFractionDigits: 2 }).format(amount);
export function PriceDetails({ item }: { item: ShoppingItem }) {
  const recommendation = item.recommendation;
  if (!recommendation || recommendation.status === "manual") return <span className="notice">Manual item · no catalog price</span>;
  const offer = recommendation.offer;
  return <div className="notice">
    {offer && <><span className="price">{money(offer.price)} / package{recommendation.lineTotal !== null ? ` · ${money(recommendation.lineTotal)} total` : ""}</span>
      <span>{offer.branch || "Branch not specified"} · retrieved {new Date(offer.retrievedAt).toLocaleString()}</span>
      {offer.sourceUpdatedAt && <div>Source updated: {offer.sourceUpdatedAt}</div>}
      {(offer.saleType || offer.promoPeriod) && <div>{offer.saleType} {offer.promoPeriod}</div>}</>}
    {recommendation.stale && <div>Outdated price snapshot</div>}
    {recommendation.incomplete && <div>Search coverage incomplete</div>}
    {recommendation.warning && <div>{recommendation.warning}</div>}
  </div>;
}
export function ListTotal({ items }: { items: ShoppingItem[] }) {
  const priced = items.filter((i) => i.recommendation?.lineTotal != null);
  const amount = priced.reduce((sum, i) => sum + i.recommendation!.lineTotal!, 0);
  return <p className="notice">Estimated priced subtotal: {money(amount)} · {items.length - priced.length} unpriced item(s){priced.some((i) => i.recommendation?.stale) ? " · includes outdated prices" : ""}</p>;
}
