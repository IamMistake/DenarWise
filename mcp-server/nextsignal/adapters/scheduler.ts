import type { SchedulerAdapter } from "@gotch/nextsignal";

// Scheduler adapters are optional until you add recurring processes.
//
// In production, this adapter owns:
// - intervals or cron translation
// - distributed locks
// - missed-run policy
// - overlap behavior
//
// For simple deployments, you can also trigger recurring processes manually
// from an external cron by calling `app.runScheduledProcess("process.name")`.
export const schedulerAdapter: SchedulerAdapter | undefined = undefined;
