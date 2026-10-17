import type { LoggerAdapter } from "@gotch/nextsignal";
import type { LogEntry } from "@gotch/nextsignal";
import { nextsignalLogs } from "@/nextsignal/db/schema";
import { getDb } from "@/nextsignal/services/database";

export const loggerAdapter: LoggerAdapter = {
  debug(entry) {
    void writeLog("debug", entry);
  },
  info(entry) {
    void writeLog("info", entry);
  },
  warn(entry) {
    void writeLog("warn", entry);
  },
  error(entry) {
    void writeLog("error", entry);
  }
};

type LogLevel = "debug" | "info" | "warn" | "error";

async function writeLog(level: LogLevel, entry: LogEntry) {
  try {
    const db = await getDb();
    await db.insert(nextsignalLogs).values({
      id: crypto.randomUUID(),
      level,
      message: entry.message,
      process: entry.process ?? null,
      correlationId: entry.correlationId ?? null,
      data: entry.data ?? null,
      error: serializeError(entry.error) ?? null
    });
  } catch {
    // Logging must not break application work.
  }
}

function serializeError(error: unknown): unknown {
  if (!error) return undefined;
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return error;
}
