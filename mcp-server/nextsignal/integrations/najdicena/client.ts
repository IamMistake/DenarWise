import { z } from "zod";
import { limiter, deadlineSignal } from "@/nextsignal/catalog/concurrency";
import { hash, normalize } from "@/nextsignal/catalog/normalize";
import { policy } from "@/nextsignal/catalog/policy";
import type { CatalogOffer, SearchResult } from "@/nextsignal/catalog/types";
import { log, stage } from "@/nextsignal/observability/context";

const rowSchema = z.object({
  _id: z.string(), name: z.string().min(1), normalizedName: z.string().optional(), description: z.string().default(""),
  marketName: z.string().min(1), marketSubName: z.string().default(""), price: z.number().finite().nonnegative(),
  available: z.boolean(), saleType: z.string().default(""), promoPeriod: z.string().default(""),
  saved_at: z.string().default(""), market_saved_at: z.string().default("")
});
const responseSchema = z.object({ metadata: z.object({ total: z.number().int().nonnegative() }), data: z.array(rowSchema) });
const gate = limiter(policy.catalogConcurrency);
export type Fetch = typeof fetch;

export function createNajdiCenaClient(fetcher: Fetch = fetch) {
  async function page(search: string, pageNumber: number, signal: AbortSignal) {
    return gate(() => stage("najdicena.request", { provider: "najdicena", page: pageNumber }, async () => {
      const url = new URL("https://api-new.najdicena.com/api/v1/products/search");
      url.search = new URLSearchParams({ search, page: String(pageNumber), pageSize: String(policy.pageSize) }).toString();
      for (let attempt = 0; attempt < 2; attempt++) {
        signal.throwIfAborted();
        await log("debug", "najdicena.attempt", { attempt, page: pageNumber });
        let response: Response;
        try {
          response = await fetcher(url, { headers: { Accept: "application/json", "User-Agent": "DenarWise/1.0" }, signal: deadlineSignal(signal, 6000), cache: "no-store" });
        } catch (error) {
          if (signal.aborted || attempt === 1) throw error;
          await log("warn", "najdicena.network_retry", { attempt, page: pageNumber });
          continue;
        }
        await log("debug", "najdicena.response", { status: response.status, attempt, page: pageNumber });
        if (!response.ok) {
          await log("warn", "najdicena.http_error", { status: response.status, attempt, page: pageNumber });
          if (attempt === 0 && (response.status === 429 || response.status >= 500)) continue;
          throw new Error(`NajdiCena returned HTTP ${response.status}.`);
        }
        const parsed = responseSchema.safeParse(await response.json());
        if (!parsed.success) throw new Error("NajdiCena returned an invalid catalog response.");
        return parsed.data;
      }
      throw new Error("NajdiCena request exhausted retries.");
    }), signal);
  }

  return {
    async search(search: string, signal: AbortSignal): Promise<SearchResult> {
      const offers = new Map<string, CatalogOffer>();
      const retrievedAt = new Date().toISOString();
      const first = await page(search, 0, signal);
      const total = first.metadata.total;
      const pageCount = first.data.length ? Math.min(policy.maxPages, Math.ceil(total / policy.pageSize)) : 1;
      const remaining = await Promise.allSettled(Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) => page(search, index + 1, signal)));
      signal.throwIfAborted();
      const failedPages = remaining.filter((result) => result.status === "rejected").length;
      if (failedPages) await log("warn", "najdicena.pages_incomplete", { failedPages });
      const pages = [first, ...remaining.flatMap((result) => result.status === "fulfilled" ? [result.value] : [])];
      for (const result of pages) {
        for (const row of result.data) {
          // Stable across source snapshot IDs, but a changed source name gets a new mapping.
          const id = hash(["najdicena", row.marketName, row.marketSubName, normalize(row.name)].join("|"));
          offers.set(id, { id, sourceId: row._id, name: row.name, normalizedName: normalize(row.name), description: row.description,
            market: row.marketName, branch: row.marketSubName, price: row.price, available: row.available,
            saleType: row.saleType, promoPeriod: row.promoPeriod, sourceUpdatedAt: row.market_saved_at || row.saved_at, retrievedAt });
        }
      }
      const incomplete = failedPages > 0 || offers.size < total;
      if (incomplete) await log("warn", "najdicena.search_incomplete", { returned: offers.size, total });
      return { offers: [...offers.values()], incomplete, retrievedAt };
    }
  };
}
export const najdiCena = createNajdiCenaClient();
