import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import * as schema from "../nextsignal/db/schema";
import { createSpacesService } from "../nextsignal/services/spaces";
import type { getDb } from "../nextsignal/services/database";
import { parseAttributes } from "../nextsignal/catalog/normalize";

const pg = new PGlite();
const queries: string[] = [];
const db = drizzle(pg, { schema, logger: { logQuery(query) { queries.push(query); } } });
const spaces = createSpacesService(async () => db as unknown as Awaited<ReturnType<typeof getDb>>);

before(async () => {
  const journal = JSON.parse(await readFile(new URL("../drizzle/meta/_journal.json", import.meta.url), "utf8"));
  for (const entry of journal.entries) await pg.exec(await readFile(new URL(`../drizzle/${entry.tag}.sql`, import.meta.url), "utf8"));
  await db.insert(schema.homeUsers).values(["owner", "member", "outsider", "empty"].map((id) => ({
    id, email: `${id}@example.test`, displayName: id
  })));
});
after(async () => { await pg.close(); });

test("dashboard reads stay bounded across spaces, exclude other spaces, and never refresh stale products", async (t) => {
  const first = await spaces.create({ userId: "owner", name: "First" });
  await spaces.joinByCode({ userId: "member", code: first.inviteCode });
  queries.length = 0;
  const single = await spaces.listDashboard("owner");
  const singleQueryCount = queries.length;
  assert.equal(single.length, 1);
  assert.equal(single[0].memberCount, 2);
  assert.equal(single[0].members.length, 2);

  for (let i = 0; i < 7; i++) await spaces.create({ userId: "owner", name: `Extra ${i}` });
  const privateSpace = await spaces.create({ userId: "outsider", name: "Private" });
  await db.insert(schema.catalogProducts).values({
    id: "stale-product", refreshedAt: new Date(0),
    product: { id: "stale-product", name: "Milk", anchorName: "Milk 1l", keywords: ["milk"], attributes: parseAttributes("Milk 1l") }
  });
  await db.insert(schema.homeShoppingItems).values([
    { id: "visible-item", spaceId: first.id, name: "Milk", quantity: "2", productId: "stale-product", store: "Kam" },
    { id: "private-item", spaceId: privateSpace.id, name: "Private item", quantity: "1" }
  ]);
  const fetch = t.mock.method(globalThis, "fetch", () => { throw new Error("Dashboard must not fetch prices"); });
  queries.length = 0;
  const dashboard = await spaces.listDashboard("owner");
  assert.equal(dashboard.length, 8);
  assert.equal(queries.length, singleQueryCount, "more spaces must not add database round trips");
  assert.ok(queries.length <= 4);
  assert.equal(fetch.mock.callCount(), 0);
  assert.ok(dashboard.every((space) => space.id !== privateSpace.id));
  assert.deepEqual(dashboard.flatMap((space) => space.items).map((item) => item.id), ["visible-item"]);
  assert.equal(dashboard[0].items[0].store, "Kam");
  assert.equal(dashboard[0].items[0].recommendation, undefined);
  assert.ok(dashboard.flatMap((space) => space.members).every((member) => member.userId !== "outsider"));
});

test("empty dashboards do not issue member or item queries", async () => {
  queries.length = 0;
  assert.deepEqual(await spaces.listDashboard("empty"), []);
  assert.equal(queries.length, 1);
});

test("create, repeated join, and leave immediately produce correct dashboards and transfer ownership", async () => {
  const created = await spaces.create({ userId: "owner", name: "Lifecycle" });
  const code = created.inviteCode.toLowerCase().match(/.{1,4}/g)!.join("-");
  const joined = await spaces.joinByCode({ userId: "member", code: ` ${code} ` });
  assert.equal(joined?.id, created.id);
  await spaces.joinByCode({ userId: "member", code });
  assert.equal((await spaces.getDetails("member", created.id)).memberCount, 2);
  assert.ok((await spaces.listDashboard("member")).some((space) => space.id === created.id));
  await assert.rejects(() => spaces.getDetails("outsider", created.id));

  await db.insert(schema.homeShoppingItems).values({ id: "lifecycle-item", spaceId: created.id, name: "Bread", quantity: "1" });
  const left = await spaces.leave({ userId: "owner", spaceId: created.id });
  assert.equal(left.deletedSpace, false);
  assert.ok((await spaces.listDashboard("owner")).every((space) => space.id !== created.id));
  assert.equal((await spaces.getDetails("member", created.id)).role, "owner");

  const deleted = await spaces.leave({ userId: "member", spaceId: created.id });
  assert.equal(deleted.deletedSpace, true);
  assert.ok((await spaces.listDashboard("member")).every((space) => space.id !== created.id));
  assert.deepEqual(await db.select().from(schema.homeShoppingItems).where(eq(schema.homeShoppingItems.spaceId, created.id)), []);
  assert.deepEqual(await db.select().from(schema.spacesTable).where(eq(schema.spacesTable.id, created.id)), []);
});
