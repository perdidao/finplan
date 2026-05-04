import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { migrate } from "drizzle-orm/neon-http/migrator";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const sqlClient = neon(url);
  const db = drizzle(sqlClient);

  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  await sqlClient`INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`;
  console.log("✓ Migrations applied");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
