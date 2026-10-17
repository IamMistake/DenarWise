export function sanitize(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[truncated]";
  if (value instanceof Error) return { name: value.name, message: redact(value.message).slice(0, 1000), stack: redact(value.stack ?? "").slice(0, 4000) };
  if (typeof value === "bigint") return String(value);
  if (typeof value === "string") return redact(value).slice(0, 2500);
  if (Array.isArray(value)) return value.slice(0, 30).map((entry) => sanitize(entry, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [
    key, /authorization|api.?key|cookie|password|secret|token|payload|prompt/i.test(key) ? "[redacted]" : sanitize(entry, depth + 1)
  ]));
  return value;
}

function redact(value: string) {
  let text = value.replace(/Bearer\s+[^\s"']+/gi, "Bearer [redacted]").replace(/(?:vck_|sk[-_])[\w-]+/g, "[redacted]");
  for (const [name, secret] of Object.entries(process.env)) {
    if (/KEY|PASSWORD|SECRET|TOKEN/i.test(name) && secret && secret.length >= 8) text = text.replaceAll(secret, "[redacted]");
  }
  return text;
}
