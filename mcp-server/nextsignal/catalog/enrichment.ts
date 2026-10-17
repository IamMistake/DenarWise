import type { GatewayClient } from "@/nextsignal/integrations/ai-gateway/client";
import { MODELS } from "@/nextsignal/integrations/ai-gateway/client";
import { log } from "@/nextsignal/observability/context";
import type { Candidate } from "./candidates";
import { deadlineSignal } from "./concurrency";
import { normalize } from "./normalize";
import { policy } from "./policy";
import type { CatalogRepository } from "./repository";

type Extraction = Awaited<ReturnType<GatewayClient["extract"]>>[number];

/** Optional attributes must never prevent already-relevant products being offered. */
export async function enrichCandidates(candidates: Candidate[], parent: AbortSignal, repository: CatalogRepository, gateway: GatewayClient): Promise<boolean> {
  // Qwen cannot resolve omitted sizes/variants: those must remain unknown. Only
  // names missing a brand/category need extraction; Jev handles identity directly.
  const ambiguous = candidates.filter((candidate) => !candidate.attributes.brand || !candidate.attributes.category)
    .sort((a, b) => b.probability - a.probability).slice(0, policy.enrichmentLimit);
  if (!ambiguous.length) return false;
  const signal = deadlineSignal(parent, policy.enrichmentMs);
  const pending: Candidate[] = [];
  const cached = await repository.cachedMany<Extraction>("attributes", ambiguous.map((c) => `${MODELS.qwen}:${c.id}`));
  for (const candidate of ambiguous) {
    const value = cached.get(`${MODELS.qwen}:${candidate.id}`);
    if (value) apply(candidate, value); else pending.push(candidate);
  }
  const batches = Array.from({ length: Math.ceil(pending.length / policy.enrichmentBatchSize) }, (_, index) =>
    pending.slice(index * policy.enrichmentBatchSize, (index + 1) * policy.enrichmentBatchSize));
  const outcomes = await Promise.all(batches.map(async (records) => {
    try {
      const extracted = await gateway.extract(records.map(({ id, name }) => ({ id, name })), signal);
      const grounded: Extraction[] = [];
      for (const value of extracted) {
        const candidate = records.find((c) => c.id === value.id)!;
        if (!value.evidence.length || value.evidence.some((e) => !e.trim() || !normalize(candidate.name).includes(normalize(e)))) {
          await log("warn", "matching.extraction_ungrounded", { candidateId: candidate.id });
          continue;
        }
        apply(candidate, value);
        grounded.push(value);
      }
      await repository.cacheMany("attributes", grounded.map((value) => ({ key: `${MODELS.qwen}:${value.id}`, data: value })), 30 * 86400_000);
      return false;
    } catch {
      await log("warn", "matching.extraction_unavailable", { candidateCount: records.length, timedOut: signal.aborted });
      return true;
    }
  }));
  return outcomes.some(Boolean);
}
function apply(candidate: Candidate, extracted: Extraction) {
  const name = normalize(candidate.name);
  const grounded = (attribute: string | null) => attribute && name.includes(normalize(attribute)) ? normalize(attribute) : null;
  candidate.attributes.brand ??= grounded(extracted.brand);
  candidate.attributes.category ??= grounded(extracted.category);
  candidate.proposal = extracted.group;
  const tokens = (value: string) => normalize(value).split(" ").sort().join(" ");
  if (tokens(extracted.canonicalName) === tokens(candidate.name)) candidate.canonicalName = extracted.canonicalName;
}
