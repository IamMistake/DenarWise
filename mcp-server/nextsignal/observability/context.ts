import { AsyncLocalStorage } from "node:async_hooks";
import type { LogEntry, LoggerAdapter } from "@gotch/nextsignal";
import { loggerAdapter } from "@/nextsignal/adapters/logger";

type Scope = { correlationId: string; process?: string; logger?: LoggerAdapter };
const scopes = new AsyncLocalStorage<Scope>();
const reported = new WeakSet<object>();

export function withLogScope<T>(scope: Partial<Scope>, run: () => T): T {
  return scopes.run({ correlationId: crypto.randomUUID(), ...scopes.getStore(), ...scope }, run);
}

export function correlationId() { return scopes.getStore()?.correlationId; }

export async function log(level: "debug" | "info" | "warn" | "error", message: string, data?: unknown, error?: unknown) {
  const scope = scopes.getStore();
  const entry: LogEntry = { message, data, error, process: scope?.process, correlationId: scope?.correlationId };
  await (scope?.logger ?? loggerAdapter)[level]?.(entry);
}

export async function stage<T>(operation: string, data: Record<string, unknown>, run: () => Promise<T>): Promise<T> {
  const started = performance.now();
  await log("debug", `${operation}.started`, data);
  try {
    const result = await run();
    await log("info", `${operation}.completed`, { ...data, durationMs: Math.round(performance.now() - started) });
    return result;
  } catch (error) {
    const alreadyReported = typeof error === "object" && error !== null && reported.has(error);
    await log(alreadyReported ? "warn" : "error", `${operation}.failed`, {
      ...data, durationMs: Math.round(performance.now() - started), alreadyReported
    }, alreadyReported ? undefined : error);
    if (typeof error === "object" && error !== null) reported.add(error);
    throw error;
  }
}
