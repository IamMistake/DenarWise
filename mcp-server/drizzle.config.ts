import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";
import { CONFIG_ENV_PREFIX } from "./nextsignal/config";

loadEnvConfig(process.cwd());

const databaseUrlEnv = `${CONFIG_ENV_PREFIX}DATABASE__URL`;

export default defineConfig({
  dialect: "postgresql",
  schema: "./nextsignal/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env[databaseUrlEnv] ?? ""
  }
});
