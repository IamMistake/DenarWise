import type { LoggerAdapter } from "@gotch/nextsignal";
import type { LogEntry } from "@gotch/nextsignal";
import { nextsignalLogs } from "@/nextsignal/db/schema";
import { getDb } from "@/nextsignal/services/database";
import { sanitize } from "@/nextsignal/observability/sanitize";

export const loggerAdapter: LoggerAdapter = {
  debug(entry) {
    return writeLog("debug", entry);
  },
  info(entry) {
    return writeLog("info", entry);
  },
  warn(entry) {
    return writeLog("warn", entry);
  },
  error(entry) {
    return writeLog("error", entry);
  }
};

type LogLevel = "debug" | "info" | "warn" | "error";

async function writeLog(level: LogLevel, entry: LogEntry) {
  const safe = sanitize(entry) as LogEntry;
  try {
    const db = await getDb();
    await db.insert(nextsignalLogs).values({
      id: crypto.randomUUID(),
      level,
      message: safe.message,
      process: safe.process ?? null,
      correlationId: safe.correlationId ?? null,
      data: safe.data ?? null,
      error: safe.error ?? null
    });
  } catch (error) {
    try {
      console.error(JSON.stringify({ level, ...safe, logPersistenceFailed: true, loggingError: sanitize(error) }));
    } catch {
      // A failing log sink must not fail the shopping operation.
    }
  }
}
