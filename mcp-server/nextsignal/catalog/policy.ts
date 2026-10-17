export const MATCHING_VERSION = "catalog-v2";
export const policy = {
  maxItems: 20, pageSize: 200, maxPages: 3, catalogConcurrency: 6, modelConcurrency: 4,
  candidateLimit: 80, choiceLimit: 8, deadlineMs: 25_000, freshnessMs: 15 * 60_000,
  enrichmentLimit: 8, enrichmentBatchSize: 4, enrichmentMs: 4000, persistenceReserveMs: 5000,
  exactProbability: 0.9, possibleProbability: 0.5, mergeProbability: 0.98
} as const;
