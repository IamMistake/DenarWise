# NajdiCena integration

Status: planned. API observations below were made on **2026-10-17** during repository research. This is an undocumented website API, not a confirmed supported third-party API contract.

## Observed search endpoint

The frontend at <https://najdicena.mk/> calls:

```http
GET https://api-new.najdicena.com/api/v1/products/search?page=0&search=млеко&pageSize=20
```

A direct request with `pageSize=2` returned HTTP 200 without an API key or runtime-session header, with `metadata.total` of `1483` for `млеко`. This count is an observation, not a fixture or guarantee.

The deployed frontend also sends an `X-Runtime-Session` header through its shared fetch helper. Its purpose and whether it becomes required need verification; no authentication contract has been established.

### Parameters seen in frontend code

| Parameter | Observed use |
| --- | --- |
| `search` | Product search text |
| `page` | Zero-based page number |
| `pageSize` | Requested result count |
| `market` | Comma-separated market identifiers |
| `dMin`, `dMax` | Discount filters |

Search and pagination were exercised in a sample request; market filtering, discount boundaries, page-size limits, ordering, and full pagination behavior still need verification.

### Sample response shape

Abbreviated from the observed response:

```json
{
  "metadata": { "total": 1483 },
  "data": [
    {
      "_id": "source-offer-id",
      "name": "Swisslion Eurovafel Plus – Вафла млеко и какао 20g",
      "available": false,
      "description": "Чоколади, десерти и грицки, Кондиторски производи, Види цена",
      "price": 6,
      "regularPrice": 0,
      "discountPrice": 0,
      "discount": 0,
      "marketName": "repti",
      "marketSubName": "reptil",
      "saved_at": "2026-10-17T09:00:13",
      "market_saved_at": "2026-10-17 09:02:05.969925",
      "saleType": "",
      "promoPeriod": "",
      "normalizedName": "swisslion eurovafel plus - vafla mleko i kakao 20g",
      "originalName": ""
    }
  ]
}
```

The result demonstrates broad text matching: a milk query can return a wafer. `metadata.total` counts source results; it must not be presented as a count of distinct exact products.

## Planned service boundary

Add `mcp-server/nextsignal/services/najdicena.ts` and register it through the app's existing service composition.

Responsibilities:

- Construct requests with `URL`/`URLSearchParams` and a configurable base URL.
- Validate external JSON with Zod and normalize source offers.
- Fetch pages with deduplication, bounded requests/concurrency, timeouts, and retry handling for transient failures/rate limits.
- Return retrieval metadata: fetched count, reported total, truncation, fetch time, and per-query failures.
- Cache identical requests briefly and keep source freshness separate from cache age.
- Keep source field mappings and future endpoint changes outside MCP registration and business orchestration.

Proposed internal offer fields:

| Field | Purpose |
| --- | --- |
| Source and source offer ID | Retain NajdiCena provenance and `_id` |
| Display/original/normalized name | Preserve source text and support matching |
| Description and supported attributes | Product type, brand, variant, pack size/count when known |
| Market ID and branch label | Preserve `marketName` and `marketSubName` without assuming equivalent granularity |
| Selling, regular, and promotional prices | Decimal-safe values with explicit normalization status |
| Currency | MKD assumption for initial scope; verify before quoting |
| Availability | Available / unavailable / unknown |
| Promotion text and dates | Retain raw terms when structured interpretation is uncertain |
| Source timestamps and fetched time | Preserve raw timestamps until timezone semantics are verified |
| Source page/request URL | Traceability; do not invent a product-detail URL |

Keep the source offer separate from the application's selected product identity. The sample establishes neither a barcode nor a cross-store identifier, image field, stable product-detail endpoint, or durable `_id` semantics.

## Retrieval behavior

1. Search broad terms derived from the original query, initially normalizing Macedonian Latin/Cyrillic forms.
2. Fetch subsequent pages while respecting the reported total and configured limits.
3. Deduplicate repeated source offers across pages and search terms.
4. Detect empty/repeated pages and changing result sets; expose incomplete retrieval rather than looping indefinitely.
5. Send the compact candidate set to matching. Explicitly expose budget truncation so the UI can refine or load more results.

At trip preparation time, search again using saved product names/attributes and re-establish exact equivalence. Do not assume the search API supports lookup-by-ID or exact-product filters until observed and verified.

## Integration checks before implementation is considered ready

- Confirm usable third-party integration expectations and whether supported API access is available.
- Verify representative data for the intended markets/branches; homepage logos alone do not prove coverage.
- Check response validation, pagination, market filter values, price units, discount semantics, availability, and timestamp timezone meaning.
- Establish how to distinguish branches, duplicate offers, and exact products across stores.
- Verify the behavior of `regularPrice: 0`, `discountPrice: 0`, empty promotion fields, and absent attributes.

## References

- Website: <https://najdicena.mk/>
- Search endpoint: <https://api-new.najdicena.com/api/v1/products/search?page=0&search=%D0%BC%D0%BB%D0%B5%D0%BA%D0%BE&pageSize=2>
- Site's data disclaimer: <https://najdicena.mk/disclaimer>

Public GitHub repository searches for `najdicena`, `najdi-cena`, and `"najdi cena"` returned no results during this research. No project source repository or open-source license was established.
