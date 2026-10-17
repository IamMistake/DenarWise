import { najdiCena } from "@/nextsignal/integrations/najdicena/client";
import { log } from "@/nextsignal/observability/context";
import { catalogRepository } from "./repository";
import { keywordsFor, normalize } from "./normalize";
import { policy } from "./policy";
import type { SearchResult } from "./types";

export function createRetrieval(repository = catalogRepository, client = najdiCena) {
  return function session(signal: AbortSignal) {
    const searches = new Map<string, Promise<SearchResult>>();
    async function search(term: string) {
      const key = normalize(term);
      if (!searches.has(key)) searches.set(key, (async () => {
        const cached = await repository.cached<SearchResult>("search", key);
        if (cached) return cached;
        const result = await client.search(term, signal);
        await repository.cache("search", key, result, policy.freshnessMs);
        return result;
      })());
      return searches.get(key)!;
    }
    return async (query: string, keywords: string[]): Promise<SearchResult> => {
      const terms = keywordsFor(query, keywords);
      const all = [...new Set([...terms, terms.join(" ")].filter(Boolean))];
      const results = await Promise.allSettled(all.map(search));
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
