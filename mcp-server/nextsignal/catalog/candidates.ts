import { queryConflicts, hash, normalize, parseAttributes, tokenScore } from "./normalize";
import { policy } from "./policy";
import type { CatalogOffer, MatchRequest, ProductAttributes, IdentityEvidence } from "./types";

export type Candidate = { id: string; name: string; canonicalName?: string; attributes: ProductAttributes; offers: CatalogOffer[]; probability: number; kind: "exact" | "possible" | "alternative"; warnings: string[]; proposal?: string | null; identityEvidence?: IdentityEvidence };

export function shortlist(request: MatchRequest, offers: CatalogOffer[]) {
  const byName = new Map<string, CatalogOffer[]>();
  for (const offer of offers) {
    const key = normalize(offer.name);
    byName.set(key, [...(byName.get(key) ?? []), offer]);
  }
  const wanted = parseAttributes(request.query);
  return [...byName.entries()]
    .filter(([, rows]) => !queryConflicts(wanted, parseAttributes(rows[0].name), true))
    .sort((a, b) => tokenScore(request.query, b[0]) - tokenScore(request.query, a[0]) || a[0].localeCompare(b[0]))
    .slice(0, policy.candidateLimit)
    .map(([key, rows]): Candidate => ({ id: hash(key), name: rows[0].name, attributes: parseAttributes(rows[0].name), offers: rows, probability: 0, kind: "possible", warnings: [] }));
}

export function explain(request: MatchRequest, candidate: Candidate) {
  const wanted = parseAttributes(request.query);
  const actual = candidate.attributes;
  const warnings: string[] = [];
  if (wanted.brand && !actual.brand) warnings.push("Requested brand is unverified.");
  if (wanted.category && !actual.category) warnings.push("Requested product category is unverified.");
  if (wanted.size !== null && (wanted.size !== actual.size || wanted.unit !== actual.unit)) {
    warnings.push(`Package size: requested ${wanted.size} ${wanted.unit}; found ${actual.size ?? "unknown"} ${actual.unit ?? ""}.`);
  }
  if (wanted.packCount !== null && wanted.packCount !== actual.packCount) warnings.push("Pack count differs or is unverified.");
  if (wanted.fatPercent !== null && actual.fatPercent === null) warnings.push("Requested fat percentage is unverified.");
  if (wanted.variant && !actual.variant) warnings.push("Requested variant is unverified.");
  const colours = normalize(request.query).match(/\b(?:plavo|plava|sino|sina|blue|crveno|crvena|red|zeleno|green)\b/g) ?? [];
  if (colours.some((colour) => !normalize(candidate.name).includes(colour))) warnings.push("Requested packaging colour is unverified.");
  return warnings;
}
