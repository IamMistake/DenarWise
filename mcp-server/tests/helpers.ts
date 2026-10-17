import type { LoggerAdapter } from "@gotch/nextsignal";
import { withLogScope } from "../nextsignal/observability/context";
import type { CatalogOffer } from "../nextsignal/catalog/types";
export const quietLogger: LoggerAdapter = { debug() {}, info() {}, warn() {}, error() {} };
export function quiet<T>(run: () => T) { return withLogScope({ logger: quietLogger, correlationId: "test-correlation" }, run); }
export function offer(name = "Млеко Битолско УХТ 3.2% 1л", market = "kam", price = 75): CatalogOffer {
  return { id: `${market}:${name}`, sourceId: `${market}:snapshot`, name, normalizedName: name, description: "", market, branch: `${market} branch`, price,
    available: true, saleType: "", promoPeriod: "", sourceUpdatedAt: "2026-10-17 12:00:00", retrievedAt: new Date().toISOString() };
}
