export function limiter(concurrency: number) {
  let active = 0;
  const waiting: Array<() => void> = [];
  return async <T>(run: () => Promise<T>, signal?: AbortSignal): Promise<T> => {
    if (active >= concurrency) await new Promise<void>((resolve) => waiting.push(resolve));
    else active++;
    try { signal?.throwIfAborted(); return await run(); }
    finally { const next = waiting.shift(); if (next) next(); else active--; }
  };
}

export function deadlineSignal(parent?: AbortSignal, milliseconds = 25_000) {
  const timeout = AbortSignal.timeout(milliseconds);
  return parent ? AbortSignal.any([parent, timeout]) : timeout;
}
