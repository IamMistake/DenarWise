import { gatewayClient, MODELS, type GatewayClient } from "@/nextsignal/integrations/ai-gateway/client";
import { log, stage } from "@/nextsignal/observability/context";
import { shortlist } from "./candidates";
import { deadlineSignal } from "./concurrency";
import { enrichCandidates } from "./enrichment";
import { evaluateRelevance } from "./relevance";
import { groupCandidates } from "./grouping";
import { queryConflicts, hash, normalize, normalizeMarket, parseAttributes, keywordsFor } from "./normalize";
import { MATCHING_VERSION, policy } from "./policy";
import { catalogRepository, type CatalogRepository } from "./repository";
import { createRetrieval } from "./retrieval";
import type { MatchRequest, MatchResult, ProductChoice } from "./types";

export function createMatching(repository: CatalogRepository = catalogRepository, gateway: GatewayClient = gatewayClient,
  retrieveSession = createRetrieval(repository)) {
  return {
    async match(requests: MatchRequest[], parentSignal?: AbortSignal): Promise<MatchResult[]> {
      const signal = deadlineSignal(parentSignal, policy.deadlineMs - policy.persistenceReserveMs);
      const retrieve = retrieveSession(signal);
      return Promise.all(requests.map((request) => stage("matching.item", { itemKey: hash(request.query).slice(0, 12) }, async (): Promise<MatchResult> => {
        try {
          const cacheKey = JSON.stringify({ query: request.query, keywords: request.keywords, store: request.store ?? null, models: MODELS });
          const cached = await repository.cached<MatchResult>("matches", cacheKey);
          if (cached) return cached;
          const result = await retrieve(request.query, request.keywords);
          const relevance = await stage("matching.relevance", { itemKey: hash(request.query).slice(0, 12) },
            () => evaluateRelevance(request, shortlist(request, result.offers), signal, repository, gateway));
          const candidates = relevance.candidates;
          const enrichmentFailed = await enrichCandidates(candidates, signal, repository, gateway);
          const compatible = candidates.filter((candidate) => !queryConflicts(parseAttributes(request.query), candidate.attributes, true));
          const candidateLimitReached = new Set(result.offers.map((offer) => normalize(offer.name))).size > policy.candidateLimit;
          const { groups, degraded: groupingFailed } = await groupCandidates(compatible, keywordsFor(request.query, request.keywords), signal, repository, gateway);
          const choices: ProductChoice[] = groups.map(({ product, members }) => {
            const ranked = [...members].sort((a, b) => Number(b.kind === "exact") - Number(a.kind === "exact") || b.probability - a.probability);
            const offers = members.flatMap((m) => m.offers).filter((o) => o.available && o.price > 0 && (!request.store || normalizeMarket(o.market) === normalizeMarket(request.store)));
            return { product, kind: ranked[0].kind, probability: ranked[0].probability, warnings: [...new Set(members.flatMap((m) => m.warnings))],
              marketCount: new Set(offers.map((o) => o.market)).size, cheapestPrice: offers.length ? Math.min(...offers.map((o) => o.price)) : null };
          }).sort((a, b) => Number(b.kind === "exact") - Number(a.kind === "exact") || b.probability - a.probability);
          const strong = choices.filter((c) => c.kind === "exact" && !c.warnings.length && c.marketCount > 0);
          // Persist all offers for every displayed choice; don't spend the deadline writing hidden choices.
          const displayed = choices.slice(0, policy.choiceLimit);
          await repository.saveMany(displayed.map((choice) => {
            const group = groups.find((g) => g.product.id === choice.product.id)!;
            const evidence = Object.fromEntries(group.members.flatMap((member) => member.offers.map((offer) => [offer.id, {
              ...member.identityEvidence!, matchingVersion: MATCHING_VERSION, verifiedAt: new Date().toISOString(),
              anchorName: group.product.anchorName, attributes: member.attributes,
              ...(member.identityEvidence?.method === "jev" ? { model: MODELS.jev } : {}),
              relevance: { query: request.query, probability: member.probability, kind: member.kind, warnings: member.warnings }
            }])));
            return { product: group.product, offers: group.members.flatMap((m) => m.offers), incomplete: result.incomplete, evidence };
          }));
          const incomplete = result.incomplete || candidateLimitReached || choices.length > policy.choiceLimit || relevance.degraded || enrichmentFailed || groupingFailed;
          const warnings = incomplete ? ["Search coverage is incomplete; prices are the cheapest found."] : [];
          if (relevance.degraded) warnings.push("Some candidates could not be checked. Showing only verified choices; retry to check the rest.");
          if (enrichmentFailed || groupingFailed) warnings.push("Some optional product details could not be verified; unconfirmed products remain separate choices.");
          if (!choices.length) warnings.push("No usable match found. Refine the search or keep a manual item.");
          const match = { choices: displayed, selectedProductId: !relevance.degraded && !enrichmentFailed && !groupingFailed && strong.length === 1 && choices.length === 1 ? strong[0].product.id : null, warnings, incomplete };
          if (displayed.length) {
            try { await repository.cache("matches", cacheKey, match, relevance.degraded || enrichmentFailed || groupingFailed ? 30_000 : policy.freshnessMs); }
            catch { await log("warn", "matching.cache_write_unavailable", { itemKey: hash(request.query).slice(0, 12) }); }
          }
          await log("info", "matching.item.ready", { itemKey: hash(request.query).slice(0, 12), choiceCount: displayed.length, incomplete });
          return match;
        } catch (error) {
          await log("error", "matching.item.failed", { timedOut: signal.aborted }, error);
          return { choices: [], selectedProductId: null, warnings: [process.env.AI_GATEWAY_API_KEY ? "Matching failed or timed out. Retry or keep this item manually." : "Matching requires AI_GATEWAY_API_KEY on the server. You can keep this item manually."], incomplete: true };
        }
      })));
    }
  };
}
export const matchingService = createMatching();
