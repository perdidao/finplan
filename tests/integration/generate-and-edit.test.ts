import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { migrate } from "drizzle-orm/neon-http/migrator";
import * as schema from "@/lib/db/schema";
import { sql } from "drizzle-orm";

const TEST_URL = process.env.TEST_DATABASE_URL;

const skipIfNoDb = TEST_URL ? describe : describe.skip;

skipIfNoDb("integration: generate + edit flow", () => {
  let db: ReturnType<typeof drizzle<typeof schema>>;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_URL;
    process.env.APP_PASSWORD ??= "test";
    process.env.AUTH_SECRET ??= "dGVzdC1zZWNyZXQtdGVzdC1zZWNyZXQtdGVzdC1zZWNyZXQ=";
    const httpSql = neon(TEST_URL!);
    db = drizzle(httpSql, { schema });
    await migrate(db, { migrationsFolder: "./lib/db/migrations" });
    await db.execute(
      sql`TRUNCATE monthly_entries, recurring_entries RESTART IDENTITY CASCADE`,
    );
    await db.execute(
      sql`INSERT INTO app_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
    );
  });

  afterAll(async () => {
    if (!db) return;
    await db.execute(
      sql`TRUNCATE monthly_entries, recurring_entries RESTART IDENTITY CASCADE`,
    );
  });

  it("creates templates, generates the current month, and applies edit-from-now-on", async () => {
    // Dynamic imports so DATABASE_URL is set first.
    const { addRecurringEntryAction } = await import("@/lib/server/add-entry");
    const { generateMonthAction } = await import("@/lib/server/generate-month");
    const { editFromNowOnAction } = await import("@/lib/server/edit-entry");
    const { fetchMonthRows } = await import("@/lib/server/month-view-queries");
    const { listAllTemplates } = await import("@/lib/server/recurring-queries");
    const { currentMonthInSP } = await import("@/lib/time/month");

    const month = currentMonthInSP();

    const a = await addRecurringEntryAction({
      name: "Sanepar",
      category: "fixed_bill",
      defaultAmount: "115.19",
      dueDay: 9,
      effectiveFrom: month,
    });

    await addRecurringEntryAction({
      name: "Salário",
      category: "income",
      defaultAmount: "4000.00",
      dueDay: null,
      effectiveFrom: month,
    });

    const gen = await generateMonthAction();
    expect(gen.ok).toBe(true);

    const rows1 = await fetchMonthRows(month);
    expect(rows1).toHaveLength(2);

    await editFromNowOnAction({
      oldTemplateId: a.id,
      currentMonth: month,
      patch: {
        name: "Sanepar (residência)",
        category: "fixed_bill",
        defaultAmount: "120.00",
        dueDay: 10,
      },
    });

    const templates = await listAllTemplates();
    const old = templates.find((t) => t.id === a.id);
    expect(old?.effectiveTo).not.toBeNull();
    const newTpl = templates.find(
      (t) => t.id !== a.id && t.name === "Sanepar (residência)",
    );
    expect(newTpl).toBeDefined();
    expect(newTpl?.effectiveTo).toBeNull();

    const rows2 = await fetchMonthRows(month);
    const updated = rows2.find((r) => r.recurringEntryId === newTpl?.id);
    expect(updated?.nameSnapshot).toBe("Sanepar (residência)");
    expect(updated?.amount).toBe("120.00");
    expect(updated?.dueDaySnapshot).toBe(10);
  });
});
