import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { CONFIG_ENV_PREFIX, config } from "@/nextsignal/config";
import * as schema from "@/nextsignal/db/schema";

let sqlClient: postgres.Sql | undefined;
let dbClient: PostgresJsDatabase<typeof schema> | undefined;

export async function getSql() {
  await config.load();

  if (!sqlClient) {
    const url = readString("database.url");
    if (!url) {
      throw new Error(`Missing database URL. Set config \`database.url\` or ${CONFIG_ENV_PREFIX}DATABASE__URL.`);
    }

    sqlClient = postgres(url, {
      max: Number(config.get("database.maxconnections", 3)),
      ssl: readBoolean("database.ssl", true) ? "require" : false,
      onnotice: ignoreExpectedSchemaNotice
    });
  }

  return sqlClient;
}

export async function getDb() {
  dbClient ??= drizzle(await getSql(), { schema });
  return dbClient;
}

function ignoreExpectedSchemaNotice(notice: postgres.Notice) {
  if (notice.code === "42P07") return;
  console.info(notice);
}

function readString(path: string) {
  const value = config.get<string | undefined>(path);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readBoolean(path: string, fallback: boolean) {
  const value = config.get<boolean | string | undefined>(path);
  if (value === undefined) return fallback;
  if (typeof value === "boolean") return value;
  return value.toLowerCase() === "true";
}
