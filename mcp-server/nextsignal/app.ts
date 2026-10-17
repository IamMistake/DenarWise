import { observeProcess } from "@/nextsignal/observability/process";
import type { ProcessDefinition } from "@gotch/nextsignal";
import { createNextSignalApp } from "@gotch/nextsignal";
import { adapters } from "@/nextsignal/adapters";
import { config } from "@/nextsignal/config";
import { processes } from "@/nextsignal/processes";
import { services } from "@/nextsignal/services";

// The composition root is where the framework meets your application.
// Keep databases, providers, and infrastructure details behind `services`
// and `adapters`, then keep process files focused on lifecycle and flow.
export const app = createNextSignalApp({
  processes: processes.map((process) => observeProcess(process as unknown as ProcessDefinition<unknown, unknown, typeof services>)),
  services,
  config,
  adapters
});

export type App = typeof app;
export type AppServices = typeof services;
