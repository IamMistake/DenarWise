import type { ProcessDefinition, Result, MaybePromise } from "@gotch/nextsignal";
import { log, stage, withLogScope } from "./context";

export function observeProcess<I, O, S>(process: ProcessDefinition<I, O, S>): ProcessDefinition<I, O, S> {
  const wrap = <T>(phase: string, hook: (ctx: Parameters<typeof process.handle>[0], input: I) => MaybePromise<Result<T>>) =>
    async (ctx: Parameters<typeof process.handle>[0], input: I) => withLogScope({
      correlationId: ctx.metadata.correlationId, process: process.name, logger: ctx.logger
    }, () => stage(`process.${phase}`, { process: process.name }, async () => {
      const result = await hook(ctx, input);
      if (result && typeof result === "object" && "ok" in result && !result.ok) {
        await log("warn", `process.${phase}.fault`, { process: process.name, phase, kind: result.meta.kind, errors: result.errors });
      }
      return result;
    }));
  return { ...process, auth: wrap("auth", process.auth), validate: wrap("validate", process.validate), handle: wrap("handle", process.handle) };
}
