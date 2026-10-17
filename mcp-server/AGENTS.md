# NextSignal Conventions

## Process Shape

Every API, business, and distributed process should explicitly define `auth`, `validate`, and `handle`. If a hook has nothing to do, return `ok()`.

```ts
export const processName = businessProcess({
  name: "resource.action",
  auth: () => ok(),
  validate: () => ok(),
  async handle(ctx, input) {
    return value(await ctx.services.resource.action(input));
  }
});
```

Recurring processes are different: they are triggered by the scheduler, so they define `schedule`, optional `shouldRun`, and `handle`.

## Process Folders

- `nextsignal/processes/api` owns route-facing processes.
- `nextsignal/processes/business` owns reusable business processes.
- Add `nextsignal/processes/distributed` when you introduce a queue.
- Add `nextsignal/processes/recurring` when you introduce scheduled work.

Keep route handlers thin. Routes should call `createNextRoute(app, "process.name")`.

## Handle Function Size

Inline `handle` is fine for small flows. If it grows past roughly 10 lines, extract it below the process definition:

```ts
export const createThing = apiProcess({
  name: "things.create",
  auth: requireUser(),
  validate: validateWith(createThingSchema),
  handle: createThingHandle
});

async function createThingHandle(ctx: AppContext, input: CreateThingInput) {
  // Chaining and orchestration live here.
}
```

## Services

Services are the app-owned data and integration boundary. NextSignal should not know which database, ORM, auth provider, queue, or email provider you use.

## Adapters

Adapters own infrastructure behavior:

- queue retries, locks, polling, and dead letters
- scheduler timing, locking, and missed-run behavior
- auth provider lookup
- logger sinks and formatting

Processes own lifecycle, results, orchestration, and idempotent business intent.

## Results

Return `value(data)` for success and framework fault helpers for failures. Avoid throwing for expected business, validation, auth, or forbidden outcomes. Throw only for unexpected system failures.

When forwarding a failed mediator result from one process to another, use `forwardFault(result)` so the fault envelope keeps its original metadata while matching the current process output type.

Do not change .env.example.