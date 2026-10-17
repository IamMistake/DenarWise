# Upcoming features

This folder describes planned work for DenarWise. These documents are implementation specifications, not a description of features already shipped. Tool names, contracts, and new file paths below are proposals unless explicitly described as existing.

## Next: Macedonian product discovery and shopping preparation

Two connected experiences:

1. **Find and select a product.** Turn a request such as `млеко 3,2% битолско плаво` (including Latin-script variants) into a broad NajdiCena search, match the results against the original request using an open-weight model through Vercel AI Gateway, combine relevant results with the user's purchase history, and let the user choose what to add.
2. **Prepare a shopping trip.** When the user says “going to the market, prepare the list,” refresh prices for the exact selected products, group them by store, and show line prices and basket totals for each store.

## Documents

- [Product discovery and selection](product-discovery.md): query interpretation, MCP flow, model matching, history, and the selection UI.
- [Shopping trip preparation](shopping-trip-preparation.md): exact-product comparison, store grouping, quantities, totals, and incomplete baskets.
- [NajdiCena integration](najdicena-integration.md): the observed API, normalization, pagination, and integration boundaries.
- [Implementation roadmap](implementation-roadmap.md): repo integration points, delivery order, verification, and unresolved decisions.

## Shared principles

- Preserve the user's original request; broad search terms must not erase brand or variant preferences.
- The user selects the product before it is saved to the shopping list.
- Product identity is separate from a store-specific offer. Comparing stores must preserve the selected variant and pack size.
- Use the authenticated user's own purchase history within the selected home space for the initial version.
- Compute prices and totals in application code. The matching model determines relevance, not prices or arithmetic.
- Show missing, unavailable, stale, or unpriced items explicitly; an incomplete basket must not appear cheaper than a complete one.
- Initial currency is MKD. A quoted total is an estimate based on source data, with freshness visible.
