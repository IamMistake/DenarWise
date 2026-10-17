import { createBackgroundHost } from "@gotch/nextsignal/worker";
import { app } from "@/nextsignal/app";

// The worker is a separate Node runtime from Next.js.
//
// It can run recurring process schedulers through the same host. This starter
// has no scheduler adapter configured yet, so `pnpm worker` is mostly here as
// the place to grow from.
const host = createBackgroundHost(app);

await host.start();
console.log("NextSignal background host started.");

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    console.log(`Received ${signal}. Stopping NextSignal background host.`);
    await host.stop();
    process.exit(0);
  });
}
