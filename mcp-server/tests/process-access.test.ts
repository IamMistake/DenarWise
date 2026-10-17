import { test } from "node:test";
import assert from "node:assert/strict";
import { value, type ProcessContext } from "@gotch/nextsignal";
import type { AppServices } from "../nextsignal/services";
import { shoppingPreviewAddApi } from "../nextsignal/processes/api/shopping/preview-add";
import { shoppingSearchProductsApi } from "../nextsignal/processes/api/shopping/search-products";
import { shoppingUpdateItems } from "../nextsignal/processes/business/shopping/update-items";
import { spacesDashboard } from "../nextsignal/processes/business/spaces/dashboard";
import { quietLogger } from "./helpers";
const user = { id: "user", email: "user@example.test", displayName: "User", activeSpaceId: null, createdAt: "now", updatedAt: "now" };
function context(sourceMembership = false) {
  let calls = 0;
  const ctx = {
    logger: quietLogger, metadata: { processName: "test", correlationId: "access-test" },
    auth: { requireUser: async () => value({ id: "workos-user" }) },
    services: {
      users: { ensureFromWorkOS: async () => user },
      spaces: { getMembership: async (_user: string, space: string) => sourceMembership && space === "source" ? { spaceId: space, userId: user.id, role: "member" } : null,
        getDetails: async () => ({ id: "source", name: "Source", membership: {} }) },
      shopping: { updateItems: async () => { calls++; return []; } },
      matching: { match: async () => { calls++; return []; } }
    }
  } as unknown as ProcessContext<AppServices>;
  return { ctx, calls: () => calls };
}
test("preview and row-search processes reject a nonmember before external work", async () => {
  const { ctx, calls } = context();
  const preview = await shoppingPreviewAddApi.handle(ctx, { spaceId: "other", query: "milk" });
  const search = await shoppingSearchProductsApi.handle(ctx, { spaceId: "other", itemId: "draft", query: "milk" });
  assert.equal(preview.meta.kind, "forbidden"); assert.equal(search.meta.kind, "forbidden"); assert.equal(calls(), 0);
});
test("moving items requires membership in both source and destination", async () => {
  const { ctx, calls } = context(true);
  const result = await shoppingUpdateItems.handle(ctx, { spaceId: "source", targetSpaceId: "other", itemIds: ["item"] });
  assert.equal(result.meta.kind, "forbidden"); assert.equal(calls(), 0);
});

test("dashboard resolves the authenticated home user once and scopes its batched read to that user", async () => {
  const { ctx } = context();
  let ensured = 0;
  let dashboardUser: string | undefined;
  Object.assign(ctx.services.users, { ensureFromWorkOS: async () => { ensured++; return user; } });
  Object.assign(ctx.services.spaces, { listDashboard: async (userId: string) => { dashboardUser = userId; return []; } });
  const result = await spacesDashboard.handle(ctx, {});
  assert.equal(result.ok, true);
  assert.equal(ensured, 1);
  assert.equal(dashboardUser, user.id);
});

test("confirmation retries preserve recommendations and send one notification", async () => {
  const { shoppingAddItem } = await import("../nextsignal/processes/business/shopping/add-item");
  const { ctx } = context(true);
  const saved = { id: "saved", spaceId: "source", name: "Canonical milk", quantity: "2", store: null, createdAt: "now" };
  const enriched = { ...saved, recommendation: { status: "manual" as const, offer: null, lineTotal: null, stale: false, incomplete: false } };
  let confirmations = 0;
  let notifications = 0;
  Object.assign(ctx.services.shopping, {
    resolveItems: async () => [{ name: saved.name, originalQuery: "milk", quantity: "2", productId: null, store: null, keywords: [] }],
    addItems: async () => ({ addedItems: [saved], replayed: confirmations++ > 0 }),
    listItems: async () => [enriched]
  });
  Object.assign(ctx.services.spaces, { listNotificationMembers: async () => [] });
  Object.assign(ctx.services, { email: { sendSpaceChangeNotificationAsync: () => { notifications++; } } });
  const input = { spaceId: "source", query: "milk", confirmationId: crypto.randomUUID() };
  const first = await shoppingAddItem.handle(ctx, input);
  const retry = await shoppingAddItem.handle(ctx, input);
  assert.equal(first.ok, true); assert.equal(retry.ok, true);
  assert.deepEqual(first.data?.addedItems[0].recommendation, enriched.recommendation);
  assert.equal(notifications, 1);
});
