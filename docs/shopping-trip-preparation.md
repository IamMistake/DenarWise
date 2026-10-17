# Shopping trip preparation

Status: planned.

## User experience

Trigger examples:

> Going to the market, prepare the list.
>
> Одам во маркет, подготви ја листата.

The assistant calls a dedicated read-only MCP tool for the selected home space. The server loads the active list, refreshes offers for its exact products through NajdiCena, and returns store-grouped products and totals.

Proposed tool: `shopping_prepare_trip`.

Illustrative input:

```json
{
  "spaceId": "space-id",
  "markets": ["vero", "stokomak"]
}
```

The market filter is optional. Branch selection should be supported where source coverage permits, because a chain-level label does not necessarily identify one shop.

## Workflow

1. Authenticate and verify membership in the requested space.
2. Load the active shopping list, including selected product identities and quantities.
3. Fetch current candidate offers from NajdiCena; reuse a narrowly scoped cache within the request for duplicate products.
4. Resolve offers to the exact selected product and classify availability, freshness, and promotion conditions.
5. Compute line prices and basket totals in application code.
6. Return per-store/branch baskets, missing items, and the cheapest valid offer for each product.

The tool prepares a view; it does not change the list, substitute products, or mark purchases.

## Exact products, not broad substitutions

The product chosen during [discovery](product-discovery.md) becomes the comparison target.

- Preserve brand, product type, variant, fat percentage, flavor, pack size, and pack count where supplied by the selected product.
- Normalize script and punctuation differences without treating distinct variants as identical.
- Prefer a stable cross-store identifier such as a barcode if the source actually provides it.
- The observed NajdiCena search payload does not establish a barcode or stable cross-store product ID. Treat its `_id` as a source offer reference until its semantics and stability are verified.
- Store an application-owned product reference and attribute snapshot, with associated source offers. If deterministic matching cannot establish equivalence across stores, expose uncertainty rather than asserting an exact match.
- A lower model relevance score is not enough to establish exact equivalence. Require supported identity attributes; ambiguous equivalence stays unresolved.
- An unavailable or ambiguous exact product appears as missing/unresolved. Alternatives require a separate explicit selection by the user.
- Existing free-text list rows must be resolved through product selection before they can contribute to a verified full-basket total.

## Prices and quantities

For each eligible offer, retain the current selling price, regular price, promotion price, promotion terms, currency, branch, and source timestamps.

- `0`, missing, non-finite, or negative prices are unknown/invalid unless a genuine free offer is explicitly supported; do not make them the cheapest offer.
- Do not blindly take the minimum of `price`, `regularPrice`, and `discountPrice`. Normalize their meaning using verified source behavior.
- Use a discount only when its validity and conditions support the requested purchase. Flag loyalty-only, multi-buy, or unclear promotions separately.
- Exclude offers explicitly marked unavailable from available-basket totals. Unknown availability is labeled and cannot establish an availability-confirmed full basket.
- Do not use a stale price as a fresh quote. A fresh API response can still contain an old source timestamp.
- Source price is assumed to apply to the advertised product unit/pack only after checking source semantics. Unit-price text is separate from pack selling price.
- Add a normalized purchase quantity for catalog-backed items. For `2` cartons of an exact one-liter product, line total is `2 × pack price`.
- Existing quantities are arbitrary strings. Text such as `a few`, or incompatible units such as `2 kg` for a carton, needs resolution before reliable arithmetic.
- Calculate with integer minor units or decimal-safe arithmetic and format as MKD. Never ask the model to calculate totals.

## Store grouping and totals

Return two related views:

### A. Compare a basket at each store

For each store/branch, show all requested list items, the eligible exact offer if found, quantity, unit price, line total, and missing/unresolved items.

- A **complete basket total** requires all requested products to have eligible exact offers, computable quantities, and supported availability.
- A **partial subtotal** sums only known eligible lines, with coverage such as `2 of 3 items` and the omitted item names.
- Rank complete comparable baskets by total. Keep partial/uncertain baskets visibly separate.
- Do not combine the lowest offers from different branches of a chain into a fictitious single-store basket. If only chain-level data exists, label the estimate accordingly.
- Apply an explicit item store restriction before choosing offers. If a restriction makes a single-store basket impossible, report why.

### B. Cheapest exact offer per item, grouped by store

Assign each resolvable item to its cheapest eligible offer among the requested stores, then group those assignments by store with subtotals and an overall total for resolved lines.

This is a **multi-store split basket**. Label it separately from a single-store comparison, with missing/unresolved items visible. It does not account for travel cost or optimize a route.

### Illustrative output

These prices are examples, not live quotes:

| Store/branch | Selected milk × 2 | Selected bread × 1 | Basket |
| --- | --- | --- | --- |
| Store A / branch 1 | 160 MKD | 45 MKD | **205 MKD — complete** |
| Store B / branch 2 | 150 MKD | Missing | **150 MKD — partial, 1/2 items** |

Store A is the cheapest complete basket in this example. Store B's lower partial subtotal is not a cheaper complete basket. Buying milk at B and bread at A gives a separate split-basket estimate of 195 MKD.

## Response and UI

Return structured data for the shopping UI and a concise text summary for hosts without UI support:

- List snapshot and quote generation time.
- Per-store baskets with line items, coverage, subtotal, nullable complete total, missing items, and freshness/availability status.
- Cheapest complete store, if one can be established.
- Cheapest eligible offer per item, grouped into a labeled split basket.
- Unresolved identities/quantities, unknown availability, truncated retrieval, and source failures.

Distinguish “source reports unavailable,” “no offer found,” and “lookup failed.” If the list changes during preparation, label the result as belonging to its original snapshot and allow refresh.

## Acceptance examples

- Two packs of the selected variant use twice the pack price.
- A cheaper different pack size or fat percentage is not silently substituted.
- A store missing one product gets a partial subtotal, not a winning complete total.
- Offers at separate branches are not merged into one complete branch basket.
- Expired or conditional discounts do not become unconditional current prices.
- If all stores have incomplete coverage, show that there is no confirmed complete basket.
- Calling this tool leaves the active list and purchase history unchanged.
