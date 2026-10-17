import { createHash } from "node:crypto";
import type { ProductAttributes } from "./types";

const alphabet: Record<string, string> = Object.fromEntries(
  [..."абвгдѓежзѕијклљмнњопрстќуфхцчџш"].map((letter, index) => [letter,
    ["a","b","v","g","d","gj","e","zh","z","dz","i","j","k","l","lj","m","n","nj","o","p","r","s","t","kj","u","f","h","c","ch","dzh","sh"][index]])
);

export function normalize(text: string) {
  return text.normalize("NFKC").toLowerCase().replace(/[а-шѓќѕјљњџ]/g, (letter) => alphabet[letter] ?? letter)
    .replace(/(\d),(\d)/g, "$1.$2").replace(/[×*х]/g, "x").replace(/[^a-z0-9.%+]+/g, " ").replace(/\s+/g, " ").trim();
}
export function hash(text: string) { return createHash("sha256").update(text).digest("hex"); }
export function normalizeMarket(text: string) {
  const name = normalize(text).replace(/\s+/g, "");
  return ({ reptil: "repti", zhito: "zito", kammarket: "kam" } as Record<string, string>)[name] ?? name;
}
export function keywordsFor(query: string, keywords: string[] = []) {
  return [...new Set((keywords.length ? keywords : normalize(query).split(" ").filter((word) => word.length > 2 && !/\d/.test(word)))
    .map((word) => word.trim()).filter(Boolean))].slice(0, 4);
}

export function parseAttributes(name: string): ProductAttributes {
  const text = normalize(name);
  const size = text.match(/(\d+(?:\.\d+)?)\s*(kg|gr|g|ml|l|lit(?:ar|ri)?)(?=\b|\d)/);
  const unit = size ? (/^(l|ml|lit)/.test(size[2]) ? "ml" : "g") : null;
  const amount = size ? Number(size[1]) * (/^(kg|l|lit)/.test(size[2]) ? 1000 : 1) : null;
  const pack = text.match(/(\d+)\s*[xh*х×]\s*\d/) ?? text.match(/\d+\s*(?:ml|l|g|gr|kg)\s*[xh*х×]\s*(\d+)/);
  const fat = text.match(/(\d+(?:\.\d+)?)\s*%/);
  const variants = [
    /\buht\b/.test(text) ? "uht" : null,
    /\bd3\b|\+\s*d3/.test(text) ? "d3" : null,
    /bez laktoz|lactose free|bezlaktoz/.test(text) ? "lactose-free" : null,
    /\btost\b/.test(text) ? "toast" : null,
    /\bproteinsk/.test(text) ? "protein" : null,
    /\bsvezh/.test(text) ? "fresh" : null
  ].filter(Boolean);
  const category = /\b(?:vafl|napolit|chokolad)/.test(text) ? "confectionery" : /\bkiselo mleko\b/.test(text) ? "sour-milk"
    : /\bjogurt\b/.test(text) ? "yogurt" : /\bmleko\b/.test(text) ? "milk" : /\bleb\b/.test(text) ? "bread" : null;
  return { brand: /\b(?:bitolsko|bimilk)\b/.test(text) ? "bitolsko" : /\bzhito luks\b/.test(text) ? "zhito luks" : null,
    category, variant: variants.length ? variants.sort().join("+") : null, size: amount, unit,
    packCount: pack ? Number(pack[1]) : /\bset\b/.test(text) ? null : 1,
    fatPercent: fat ? Number(fat[1]) : null };
}

export function conflicts(a: ProductAttributes, b: ProductAttributes, allowSize = false) {
  const fields: Array<keyof ProductAttributes> = ["brand", "category", "variant", "packCount", "fatPercent", ...(allowSize ? [] : ["size", "unit"] as const)];
  return fields.some((key) => a[key] !== null && b[key] !== null && a[key] !== b[key]);
}
export function queryConflicts(wanted: ProductAttributes, actual: ProductAttributes, allowSize = false) {
  const variantConflict = wanted.variant && actual.variant && wanted.variant.split("+").some((part) => !actual.variant!.split("+").includes(part));
  return Boolean(variantConflict) || conflicts({ ...wanted, variant: null }, { ...actual, variant: null }, allowSize);
}
export function identityKey(attributes: ProductAttributes): string | null {
  if (!attributes.brand || !attributes.category || !attributes.variant || !attributes.size || !attributes.unit || !attributes.packCount) return null;
  if (attributes.category === "milk" && attributes.fatPercent === null) return null;
  return hash(JSON.stringify(attributes));
}
export function tokenScore(query: string, name: string) {
  const tokens = [...new Set(normalize(query).split(" "))];
  const text = normalize(name);
  return tokens.reduce((score, token) => score + (text.includes(token) ? 1 : 0), 0) / Math.max(tokens.length, 1);
}
