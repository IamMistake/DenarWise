import { test } from "node:test";
import assert from "node:assert/strict";
import type { generateText } from "ai";
import { createGatewayClient, MODELS } from "../nextsignal/integrations/ai-gateway/client";
import { quiet } from "./helpers";
const records = [{ id: "milk", name: "Млеко Битолско 3.2% 1л" }, { id: "bread", name: "Леб 500гр" }];
const products = records.map((record) => ({ id: record.id, canonicalName: record.name, brand: null, category: null, variant: null, group: null, evidence: [record.name] }));

async function usingKey(run: () => Promise<void>) {
  const original = process.env.AI_GATEWAY_API_KEY;
  process.env.AI_GATEWAY_API_KEY = "test-only-no-network";
  try { await run(); }
  finally { if (original === undefined) delete process.env.AI_GATEWAY_API_KEY; else process.env.AI_GATEWAY_API_KEY = original; }
}
test("Qwen gets the explicit output schema even when the route only supports JSON mode", () => quiet(() => usingKey(async () => {
  let calls = 0;
  const generate = (async (options: Parameters<typeof generateText>[0]) => {
    calls++;
    assert.equal(typeof options.model === "object" && "modelId" in options.model ? options.model.modelId : undefined, MODELS.qwen);
    const input = JSON.parse(options.prompt as string);
    assert.deepEqual(input.records, records);
    assert.ok(input.outputSchema.properties.products.items.required.includes("canonicalName"));
    assert.match(options.system as string, /products/);
    assert.equal(options.maxRetries, 0);
    return { output: { products } };
  });
  const result = await createGatewayClient(generate).extract(records, AbortSignal.timeout(1000));
  assert.equal(result.length, 2); assert.equal(calls, 1);
})));
test("Qwen rejects the production failure shape and missing, duplicate or unknown IDs", () => quiet(() => usingKey(async () => {
  for (const output of [{ id: "milk", brand: null }, { products: [products[0]] }, { products: [products[0], products[0]] },
    { products: [products[0], { ...products[1], id: "unknown" }] }]) {
    const generate = async () => ({ output });
    await assert.rejects(() => createGatewayClient(generate).extract(records, AbortSignal.timeout(1000)), /invalid product attributes|product identifiers/);
  }
})));
