import { test } from "node:test";
import assert from "node:assert/strict";
import { apiProcess, ok, forbidden, validationFail, value, type ProcessContext, type LogEntry, type LoggerAdapter } from "@gotch/nextsignal";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { observeProcess } from "../nextsignal/observability/process";
import { stage, withLogScope } from "../nextsignal/observability/context";
import { instrumentMcp } from "../nextsignal/observability/mcp";
import { sanitize } from "../nextsignal/observability/sanitize";
import { loggerAdapter } from "../nextsignal/adapters/logger";
import { MODELS, gatewayClient } from "../nextsignal/integrations/ai-gateway/client";
function recorder() {
  const logs: Array<LogEntry & { level: string }> = [];
  const logger: LoggerAdapter = Object.fromEntries(["debug", "info", "warn", "error"].map((level) => [level, (entry: LogEntry) => { logs.push({ ...entry, level }); }])) as LoggerAdapter;
  return { logs, logger };
}
test("process hooks log authorization, validation faults, completion and errors with one correlation ID", async () => {
  const { logs, logger } = recorder();
  const ctx = { logger, metadata: { processName: "test", correlationId: "correlation" } } as ProcessContext;
  const process = observeProcess(apiProcess({ name: "test", auth: () => forbidden("No membership"), validate: () => validationFail("Invalid quantity"), handle: () => value("ok") }));
  await process.auth(ctx, undefined); await process.validate(ctx, undefined); await process.handle(ctx, undefined);
  assert.ok(logs.some((l) => l.message === "process.auth.fault"));
  assert.ok(logs.some((l) => l.message === "process.validate.fault"));
  assert.ok(logs.some((l) => l.message === "process.handle.completed"));
  assert.ok(logs.every((l) => l.correlationId === "correlation"));
  const throwing = observeProcess(apiProcess({ name: "throwing", auth: () => ok(), validate: () => ok(), handle: () => { throw new Error("bad persistence"); } }));
  await assert.rejects(async () => throwing.handle(ctx, undefined));
  assert.ok(logs.some((l) => l.message === "process.handle.failed" && l.error instanceof Error));
});
test("stage logs record an exception at its owner and reference it at outer boundaries", async () => {
  const { logger, logs } = recorder();
  await withLogScope({ logger, correlationId: "shared" }, async () => {
    await assert.rejects(() => stage("outer", {}, () => stage("inner", {}, async () => { throw new Error("network timeout"); })));
  });
  assert.equal(logs.filter((l) => l.level === "error").length, 1);
  assert.ok(logs.some((l) => l.message === "outer.failed" && l.level === "warn"));
});
test("MCP protocol logging covers success, returned errors, schema validation and thrown handlers", async () => {
  const { logger, logs } = recorder();
  await withLogScope({ logger }, async () => {
    const server = new McpServer({ name: "test", version: "1" }); instrumentMcp(server);
    server.registerTool("sample", { inputSchema: { count: z.number().positive() } }, async ({ count }) => count === 2 ? { isError: true, content: [{ type: "text", text: "fault" }] } : { content: [{ type: "text", text: "ok" }] });
    server.registerTool("throwing", {}, async () => { throw new Error("handler failed"); });
    const client = new Client({ name: "test", version: "1" });
    const [left, right] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(left), client.connect(right)]);
    await client.callTool({ name: "sample", arguments: { count: 1 } });
    await client.callTool({ name: "sample", arguments: { count: 2 } });
    const invalid = await client.callTool({ name: "sample", arguments: { count: -1 } });
    const thrown = await client.callTool({ name: "throwing", arguments: {} });
    assert.equal(invalid.isError, true); assert.equal(thrown.isError, true);
    assert.equal(JSON.stringify(thrown).includes("handler failed"), false);
    assert.ok(logs.some((entry) => entry.message === "mcp.handler.failed" && entry.error instanceof Error));
    assert.equal(logs.filter((l) => l.message === "mcp.tool.started").length, 4);
    assert.equal(logs.filter((l) => l.message === "mcp.tool.fault").length, 3);
    await client.close(); await server.close();
  });
});
test("secrets and provider payloads are redacted, including error strings", () => {
  const result = JSON.stringify(sanitize({ authorization: "Bearer SECRET", apiKey: "SECRET", payload: { private: "request" }, error: new Error("Bearer SECRET sk-test-key") }));
  assert.equal(result.includes("SECRET"), false); assert.equal(result.includes("sk-test-key"), false); assert.equal(result.includes("request"), false);
});
test("database logger failure produces a sanitized console fallback", async () => {
  const original = console.error; const output: string[] = [];
  console.error = (text) => { output.push(String(text)); };
  try { await loggerAdapter.error({ message: "failed", data: { apiKey: "secret" }, error: new Error("upstream failed") }); }
  finally { console.error = original; }
  assert.equal(output.length, 1); assert.ok(output[0].includes("logPersistenceFailed")); assert.equal(output[0].includes('"secret"'), false);
});
test("model allowlist is exactly Jev and Qwen; missing authentication fails explicitly", async () => {
  assert.deepEqual(Object.values(MODELS), ["typesafe-ai/jev-1.14.0", "alibaba/qwen3-next-80b-a3b-instruct"]);
  if (process.env.AI_GATEWAY_API_KEY) return;
  const { logger } = recorder();
  await withLogScope({ logger }, async () => {
    await assert.rejects(() => gatewayClient.decisions({}, { match: { type: "boolean", instructions: "Match?" } }, AbortSignal.timeout(1000)), /AI_GATEWAY_API_KEY/);
  });
});

test("invalid decision probabilities fail closed before caching", async () => {
  const { validateDecisions } = await import("../nextsignal/integrations/ai-gateway/client");
  assert.deepEqual(validateDecisions(["a"], { a: 0.99 }), { a: 0.99 });
  for (const answer of [{}, { a: 0.9, unknown: 0.9 }, { a: NaN }, { a: 1.1 }, { a: -0.1 }]) {
    assert.throws(() => validateDecisions(["a"], answer), /invalid decision/);
  }
});

test("system faults expose a diagnostic reference without private error details", async () => {
  const { toMcpToolResult } = await import("../nextsignal/mcp/result");
  const result = toMcpToolResult({ ok: false, errors: [{ message: "Private provider response", details: { raw: "sensitive" } }], meta: { kind: "system", correlationId: "diagnostic-id" } });
  assert.match(JSON.stringify(result), /diagnostic-id/);
  assert.doesNotMatch(JSON.stringify(result), /Private provider|sensitive/);
});
