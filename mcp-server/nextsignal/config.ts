import { createConfig, envConfigProvider, jsonConfigProvider } from "@gotch/nextsignal";

// Configuration is intentionally app-owned. This starter loads a committed JSON
// default first, then overlays environment values prefixed with CONFIG_ENV_PREFIX.
//
// Example:
// NEXTSIGNAL_DATABASE__URL maps to config path `database.url`.
export const CONFIG_ENV_PREFIX = "NEXTSIGNAL_";

export const config = createConfig({
  providers: [
    jsonConfigProvider("config/default.json"),
    envConfigProvider({ prefix: CONFIG_ENV_PREFIX })
  ]
});

export async function requireConfigString(path: string): Promise<string> {
  await config.load();

  const value = config.require<string>(path).trim();
  if (!value) {
    throw new Error(`Missing required config value: ${path}`);
  }

  return value;
}
