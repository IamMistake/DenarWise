import { najdiCena } from "@/nextsignal/integrations/najdicena/client";
import { log } from "@/nextsignal/observability/context";
import { catalogRepository } from "./repository";
import { keywordsFor, normalize } from "./normalize";
import { policy } from "./policy";
import type { SearchResult } from "./types";

export function createRetrieval(repository = catalogRepository, client = najdiCena) {
  return function session(signal: AbortSignal) {
    const searches = new Map<string, Promise<SearchResult>>();
    function ensureSearches(terms: string[]) {
      const missing = [...new Map(terms.filter((term) => !searches.has(normalize(term))).map((term) => [normalize(term), term])).entries()];
      if (!missing.length) return;
      const batch = (async () => {
        const cached = await repository.cachedMany<SearchResult>("search", missing.map(([key]) => key));
        const results = await Promise.allSettled(missing.map(async ([key, term]) => ({
          key, fresh: !cached.has(key), result: cached.get(key) ?? await client.search(term, signal)
        })));
        const fresh = results.flatMap((result) => result.status === "fulfilled" && result.value.fresh
          ? [{ key: result.value.key, data: result.value.result }] : []);
        try { await repository.cacheMany("search", fresh, policy.freshnessMs); }
        catch { await log("warn", "catalog.search.cache_write_unavailable", { count: fresh.length }); }
        return results;
      })();
      missing.forEach(([key], index) => searches.set(key, batch.then((results) => {
        const result = results[index];
        if (result.status === "rejected") throw result.reason;
        return result.value.result;
      })));
    }
    return async (query: string, keywords: string[]): Promise<SearchResult> => {
      const terms = keywordsFor(query, keywords);
      const all = [...new Set([...terms, terms.join(" ")].filter(Boolean))];
      ensureSearches(all);
      const results = await Promise.allSettled(all.map((term) => searches.get(normalize(term))!));
      const successful = results.flatMap((r) => r.status === "fulfilled" ? [r.value] : []);
      const failed = results.length - successful.length;
      if (!successful.length) throw new Error("Catalog search failed. Retry or keep this item manually.");
      if (failed) await log("warn", "catalog.search.partial_failure", { failed, successful: successful.length });
      return { offers: [...new Map(successful.flatMap((r) => r.offers).map((offer) => [offer.id, offer])).values()],
        incomplete: failed > 0 || successful.some((r) => r.incomplete),
        retrievedAt: successful.map((r) => r.retrievedAt).sort()[0] };
    };
  };
}
