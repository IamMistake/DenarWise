import { gzipSync, gunzipSync } from "node:zlib";
const marker = "denarwise:gzip-v1";

/** Broad catalog searches contain repeated branch listings; compact them before database writes. */
export function encodeCache(data: unknown): unknown {
  const json = JSON.stringify(data);
  if (Buffer.byteLength(json) < 16_384) return data;
  return { $cache: marker, data: gzipSync(json).toString("base64") };
}
export function decodeCache(data: unknown): unknown {
  if (!data || typeof data !== "object" || !("$cache" in data) || data.$cache !== marker) return data;
  if (!("data" in data) || typeof data.data !== "string") throw new Error("Invalid compressed cache entry.");
  return JSON.parse(gunzipSync(Buffer.from(data.data, "base64"), { maxOutputLength: 8 * 1024 * 1024 }).toString("utf8"));
}
