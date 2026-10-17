import { createNextRoute } from "@gotch/nextsignal/next";
import { app } from "@/nextsignal/app";

// Keep route handlers thin. `createNextRoute` binds query/body/route params into input,
// passes request context to the process, and converts Result envelopes to HTTP responses.
//
// Add methods by exporting more handlers:
// export const POST = createNextRoute(app, "some.process");
export const runtime = "nodejs";
export const GET = createNextRoute(app, "health.check");
