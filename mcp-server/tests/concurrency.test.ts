import { test } from "node:test";
import assert from "node:assert/strict";
import { limiter } from "../nextsignal/catalog/concurrency";
test("queued cancellation releases immediately without waiting for a slow active request", async () => {
  const gate = limiter(1);
  let release!: () => void;
  let entered!: () => void;
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const first = gate(async () => { entered(); await new Promise<void>((resolve) => { release = resolve; }); });
  await started;
  const controller = new AbortController();
  let ran = false;
  const queued = gate(async () => { ran = true; }, controller.signal);
  controller.abort(new Error("Deadline exceeded"));
  await assert.rejects(queued, /Deadline exceeded/);
  assert.equal(ran, false);
  release(); await first;
  assert.equal(await gate(async () => "next"), "next");
});
