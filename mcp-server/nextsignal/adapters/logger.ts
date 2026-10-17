import type { LoggerAdapter } from "@gotch/nextsignal";
import type { LogEntry } from "@gotch/nextsignal";
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

function writeLog(level: LogLevel, entry: LogEntry) {
  // Vercel captures stdout/stderr without a database round trip. Do not start
  // untracked persistence promises here: serverless instances can stop at response end.
  try {
    console[level](JSON.stringify({
      ...sanitize(entry) as LogEntry,
      level,
      timestamp: new Date().toISOString()
    }));
  } catch {
    // A failing log sink must not fail the operation.
  }
}
