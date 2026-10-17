import { createNextRoute } from "@gotch/nextsignal/next";
import { app } from "@/nextsignal/app";

export const runtime = "nodejs";
export const GET = createNextRoute(app, "logs.prune");
export const POST = createNextRoute(app, "logs.prune");