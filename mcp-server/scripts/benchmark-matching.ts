import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());
if (!process.env.AI_GATEWAY_API_KEY) {
  console.error("Set AI_GATEWAY_API_KEY in .env.local before benchmarking.");
  process.exitCode = 1;
} else {
  const { matchingService } = await import("../nextsignal/catalog/matching");
  const queries = [
    { query: "Mleko 3.2% bitolsko plavo", keywords: ["mleko", "bitolsko"], quantity: 2 },
    { query: "Zhito luks proteinski leb 500g", keywords: ["proteinski", "leb"], quantity: 1 },
    { query: "jajca 10", keywords: ["jajca"], quantity: 1 },
    { query: "kafe grand 200g", keywords: ["kafe", "grand"], quantity: 1 },
    { query: "voda pelisterka 1.5l", keywords: ["voda", "pelisterka"], quantity: 2 }
  ];
  for (const pass of ["first", "cached"]) {
    const started = performance.now();
    const results = await matchingService.match(queries);
    console.log(JSON.stringify({ pass, durationMs: Math.round(performance.now() - started),
      rows: results.map((result) => ({ choices: result.choices.length, preselected: Boolean(result.selectedProductId), incomplete: result.incomplete, warnings: result.warnings })) }, null, 2));
  }
  // Close the benchmark's database connections without affecting the application runtime.
  const { getSql } = await import("../nextsignal/services/database");
  await (await getSql()).end();
}
