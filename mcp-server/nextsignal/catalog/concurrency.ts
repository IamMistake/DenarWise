export function limiter(concurrency: number) {
  let active = 0;
  const waiting: Array<{ grant: () => void; cancel: () => void }> = [];
  async function acquire(signal?: AbortSignal) {
    signal?.throwIfAborted();
    if (active < concurrency) { active++; return; }
    await new Promise<void>((resolve, reject) => {
      const entry = {
        grant: () => { signal?.removeEventListener("abort", entry.cancel); resolve(); },
        cancel: () => {
          const index = waiting.indexOf(entry);
          if (index >= 0) waiting.splice(index, 1);
          signal?.removeEventListener("abort", entry.cancel);
          reject(signal?.reason ?? new Error("Queued operation cancelled."));
        }
      };
      waiting.push(entry);
      signal?.addEventListener("abort", entry.cancel, { once: true });
    });
  }
  return async <T>(run: () => Promise<T>, signal?: AbortSignal): Promise<T> => {
    await acquire(signal);
    try { signal?.throwIfAborted(); return await run(); }
    finally { const next = waiting.shift(); if (next) next.grant(); else active--; }
  };
}
export function deadlineSignal(parent?: AbortSignal, milliseconds = 25_000) {
  const timeout = AbortSignal.timeout(milliseconds);
  return parent ? AbortSignal.any([parent, timeout]) : timeout;
}
