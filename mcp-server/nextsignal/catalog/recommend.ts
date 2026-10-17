import type { CatalogOffer, Recommendation } from "./types";
import { normalizeMarket } from "./normalize";
import { policy } from "./policy";

export function recommend(offers: CatalogOffer[], quantity: string, store: string | null, incomplete: boolean, now = Date.now()): Recommendation {
  const eligible = offers.filter((offer) => offer.available && Number.isFinite(offer.price) && offer.price > 0 && (!store || normalizeMarket(store) === normalizeMarket(offer.market)));
  // Prefer fresh observations over an obsolete lower price. A failed refresh may use a labeled old snapshot.
  const recent = eligible.filter((o) => now - Date.parse(o.retrievedAt) < policy.freshnessMs);
  const pool = recent.length ? recent : eligible;
  const offer = [...pool].sort((a, b) => a.price - b.price || a.market.localeCompare(b.market) || a.branch.localeCompare(b.branch))[0] ?? null;
  const count = /^\d+$/.test(quantity) && Number(quantity) > 0 ? Number(quantity) : null;
  return { status: offer ? "priced" : "unavailable", offer, lineTotal: offer && count !== null ? Math.round(offer.price * count * 100) / 100 : null,
    stale: Boolean(offer && now - Date.parse(offer.retrievedAt) >= policy.freshnessMs), incomplete,
    ...(!offer ? { warning: store ? `No reported available offer found at ${store}.` : "No reported available offer found." } : {}) };
}
