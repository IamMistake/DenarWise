import { test } from "node:test";
import assert from "node:assert/strict";
import { createNajdiCenaClient, type Fetch } from "../nextsignal/integrations/najdicena/client";
import { quiet } from "./helpers";
const row = { _id: "snapshot1", name: "млеко 1л", marketName: "kam", marketSubName: "one", price: 75, available: true };
const response = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
test("deduplicates overlapping pages and does not rely on changing source IDs", () => quiet(async () => {
  let calls = 0;
  const client = createNajdiCenaClient((async () => response({ metadata: { total: 201 }, data: [{ ...row, _id: `snapshot${++calls}` }] })) as Fetch);
  const result = await client.search("млеко", AbortSignal.timeout(1000));
  assert.equal(calls, 2); assert.equal(result.offers.length, 1); assert.equal(result.incomplete, true);
}));
test("caps broad searches at three pages", () => quiet(async () => {
  let calls = 0;
  const client = createNajdiCenaClient((async () => { calls++; return response({ metadata: { total: 1501 }, data: [row] }); }) as Fetch);
  assert.equal((await client.search("млеко", AbortSignal.timeout(1000))).incomplete, true); assert.equal(calls, 3);
}));
test("retries transient HTTP failures once and logs failure status", () => quiet(async () => {
  let calls = 0;
  const client = createNajdiCenaClient((async () => ++calls === 1 ? response({}, 503) : response({ metadata: { total: 1 }, data: [row] })) as Fetch);
  assert.equal((await client.search("milk", AbortSignal.timeout(1000))).offers[0].price, 75); assert.equal(calls, 2);
}));
test("invalid upstream data and HTTP errors are explicit failures", () => quiet(async () => {
  for (const bad of [response({}, 403), response({ metadata: { total: 1 }, data: [{ ...row, price: "75" }] })]) {
    const client = createNajdiCenaClient((async () => bad) as Fetch);
    await assert.rejects(() => client.search("milk", AbortSignal.timeout(1000)));
  }
}));
test("propagates cancellation", () => quiet(async () => {
  const controller = new AbortController(); controller.abort();
  let calls = 0;
  const client = createNajdiCenaClient((async () => { calls++; return response({}); }) as Fetch);
  await assert.rejects(() => client.search("milk", controller.signal)); assert.equal(calls, 0);
}));

test("retries a network failure once", () => quiet(async () => {
  let calls = 0;
  const client = createNajdiCenaClient((async () => { if (++calls === 1) throw new TypeError("connection reset"); return response({ metadata: { total: 1 }, data: [row] }); }) as Fetch);
  assert.equal((await client.search("milk", AbortSignal.timeout(1000))).offers.length, 1); assert.equal(calls, 2);
}));
