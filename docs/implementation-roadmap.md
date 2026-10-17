# Implementation roadmap

Status: proposed implementation sequence for the feature described in [the overview](README.md).

## Existing implementation

Paths below are relative to the repository root:

| Location | Current role |
| --- | --- |
| `mcp-server/nextsignal/mcp/tools/shopping.ts` | Shopping tools and MCP Apps result wiring |
| `mcp-server/nextsignal/mcp/ui/shopping-app.tsx` | Draft confirmation and list UI |
| `mcp-server/nextsignal/processes/api/shopping/preview-add.ts` | Read-only draft preparation |
| `mcp-server/nextsignal/processes/business/shopping/` | Add, update, and clear orchestration |
| `mcp-server/nextsignal/services/shopping.ts` | Shopping persistence; clearing currently deletes rows |
| `mcp-server/nextsignal/db/schema.ts` | Drizzle tables; current shopping rows contain only ID, space, name, quantity, store, and creation time |
| `mcp-server/nextsignal/domain/home.ts` | Current domain types |
| `mcp-server/nextsignal/schemas.ts` | Shared input validation |

`shopping_add_item` currently prepares a draft; `shopping_ui_add_items` saves it after the user clicks Add. Preserve that confirmation flow while adding product discovery. Existing free-text rows need a nullable catalog reference and an explicit unresolved state.

## 1. Verify and normalize NajdiCena data

- Verify the contract and open questions in [the integration document](najdicena-integration.md).
- Add a typed NajdiCena service with validation, bounded pagination, failure handling, and source freshness.
- Normalize store/branch identifiers, prices, availability, and promotion fields.
- Establish the supported exact-product identity strategy from actual response data.

Deliverable: structured candidate offers and explicit retrieval completeness, usable by discovery and trip preparation.

## 2. Add selected-product persistence and purchase history

Proposed data additions, with final table/field names to follow repo conventions:

- An application-owned selected-product identity/snapshot: name, supported brand/variant/pack attributes, and associated source offer references.
- Nullable product reference, original user query, actor, normalized purchase quantity, and separate store preference on shopping items.
- A purchase-history record containing user ID, space ID, product reference/snapshot, quantity, and purchase time. Actual paid price is optional and must not be inferred from an old quote.
- An explicit purchased/completed action distinct from removing unwanted rows, with transactional history recording and list completion/removal.

Add Drizzle migrations. Existing rows remain usable as free-text unresolved items. Moving an item to another space must revalidate access and references without moving or exposing the original user's purchase history.

Deliverable: user-confirmed exact products survive on the list, and real purchases can inform later suggestions.

## 3. Add model-backed matching

- Confirm the intended “Laya” model and its Vercel AI Gateway model ID and structured-output support.
- Add Vercel AI SDK/Gateway integration using a configurable model ID and environment-backed credentials. Document required configuration without changing `mcp-server/.env.example`, per repo instructions.
- Implement normalization for Macedonian script variants and decimal separators.
- Match candidates against the original query with validated candidate-ID-only structured results, batching, and explicit uncertainty.
- Keep deterministic price calculation outside the model service.

Suggested new services: `product-matching.ts` for the model boundary and `purchase-history.ts` for user-scoped history access. Compose them through `mcp-server/nextsignal/services/index.ts` and the app's existing wiring.

Deliverable: a relevant candidate set with explanations, uncertain attributes, and a usable failure fallback.

## 4. Expose discovery and product selection

- Register proposed `shopping_find_products` with original query, optional broad terms/preferences, and required `spaceId`.
- Orchestrate retrieval, matching, relevant personal history, and deduplication in a shopping process.
- Extend the shopping UI to select products, inspect offers, adjust quantity, and access more results.
- Extend app-visible add/update contracts to carry validated product references and retain explicit user confirmation.
- Connect the purchase action from step 2 to the UI so “bought before” suggestions have real history.

Deliverable: the milk example works end to end, including Latin-script input and history merging.

## 5. Expose shopping trip preparation

- Register proposed `shopping_prepare_trip` with required `spaceId` and optional market/branch filters.
- Refresh offers for each exact selected product and resolve free-text/ambiguous items visibly.
- Calculate per-branch baskets, complete totals, partial subtotals, and cheapest-per-item split baskets.
- Render store-grouped results and a text summary with freshness, coverage, and unresolved lines.

Deliverable: “going to the market, prepare the list” returns trustworthy, quantity-aware comparisons for the active list.

## Process conventions

Follow `mcp-server/AGENTS.md`:

- MCP registrations dispatch into processes; services own database, NajdiCena, and model integrations.
- API/business processes explicitly define `auth`, `validate`, and `handle`.
- Require authentication and existing home-space membership checks for all space-scoped flows. Derive personal history's user ID from authentication, not caller-supplied identity.
- Extract longer handlers below process definitions.
- Return framework value/fault results, forwarding failed mediator results with `forwardFault`.
- Keep orchestration in processes and integration details in services.

## Verification when implementing

Use focused tests for consequential behavior rather than snapshots that mirror implementation:

- Macedonian Cyrillic/Latin input, decimal commas, and preservation of original preferences.
- Broad-result rejection (for example, a wafer versus drinking milk), model ID validation, and malformed/failing model responses.
- Relevant personal purchase history, deduplication, and isolation across users/spaces.
- Saving only after confirmation, retaining exact identity, and purchased-versus-removed history semantics.
- Paginated/truncated results, upstream failures, unavailable offers, and stale source data.
- Exact variant/pack matching, quantity multiplication, invalid price handling, promotions, separate branches, and incomplete basket ranking.

Run `pnpm check` and `pnpm build` from `mcp-server` after implementation. The current scripts bundle the MCP UI automatically. Use a bounded live NajdiCena smoke check for integration validation; do not make deterministic tests depend on changing live prices or a live model.

## Decisions to confirm

1. **Model:** What exact model does “Laya” refer to? Select an available Vercel AI Gateway model ID after confirmation.
2. **Product identity:** Can NajdiCena provide supported cross-store identifiers, or must we maintain verified identity mappings from names/attributes?
3. **Purchase action:** Agree on UI wording for “bought” versus “remove”; proposed behavior is to record history only for explicit purchases.
4. **History scope:** Initial proposal is the authenticated user's purchases within the selected space. Should a later version also offer household history?
5. **Store scope:** Which markets and locations should be enabled first? How should users select eligible branches?
6. **Operational defaults:** Set retrieval/model budgets, cache duration, quote freshness threshold, result page size, and how unknown availability affects comparisons.

## Initial completion criteria

- The user can enter the milk example in Cyrillic or Latin script, choose a relevant real product alongside relevant previously bought products, and add it to the list.
- Exact selected product identity and purchase history are persisted with user/space attribution.
- Trip preparation fetches refreshed offers, groups exact products by eligible store/branch, and shows complete totals separately from partial subtotals and split-store estimates.
- Failures and unknowns are visible without inventing product matches, prices, availability, or complete baskets.
