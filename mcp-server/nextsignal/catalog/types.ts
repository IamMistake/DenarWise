export type ProductAttributes = {
  brand: string | null;
  category: string | null;
  variant: string | null;
  size: number | null; // ml or g, for ONE package component
  unit: "ml" | "g" | null;
  packCount: number | null;
  fatPercent: number | null;
};

export type CatalogOffer = {
  id: string;
  sourceId: string;
  name: string;
  normalizedName: string;
  description: string;
  market: string;
  branch: string;
  price: number;
  available: boolean;
  saleType: string;
  promoPeriod: string;
  sourceUpdatedAt: string;
  retrievedAt: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  attributes: ProductAttributes;
  anchorName: string;
  keywords: string[];
};

export type SearchResult = { offers: CatalogOffer[]; incomplete: boolean; retrievedAt: string };
export type MatchRequest = { query: string; keywords: string[]; quantity: number; store?: string };
export type ProductChoice = {
  product: CatalogProduct;
  kind: "exact" | "possible" | "alternative";
  probability: number;
  warnings: string[];
  marketCount: number;
  cheapestPrice: number | null;
};
export type MatchResult = { choices: ProductChoice[]; selectedProductId: string | null; warnings: string[]; incomplete: boolean };
export type Recommendation = {
  status: "priced" | "manual" | "unavailable";
  offer: CatalogOffer | null;
  lineTotal: number | null;
  stale: boolean;
  incomplete: boolean;
  warning?: string;
};

export type IdentityEvidence = {
  method: "anchor-name" | "persisted-source" | "programmatic" | "jev";
  probability?: number;
};
export type MappingEvidence = IdentityEvidence & {
  matchingVersion: string;
  verifiedAt: string;
  anchorName: string;
  attributes: ProductAttributes;
  model?: string;
  relevance?: { query: string; probability: number; kind: ProductChoice["kind"]; warnings: string[] };
};
