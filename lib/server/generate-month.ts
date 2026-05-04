"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { monthlyEntries } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { activeTemplatesForMonth } from "@/lib/server/recurring-queries";
import { addMonths, currentMonthInSP } from "@/lib/time/month";

export type GenerateResult =
  | { ok: true; month: string; inserted: number }
  | { ok: false; error: "no_templates" | "already_generated" };

export async function generateMonthAction(): Promise<GenerateResult> {
  const current = currentMonthInSP();

  // First-run path: if NOTHING is materialized yet, generate the current month.
  // Otherwise generate next month.
  const anyExisting = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(monthlyEntries);
  const isFirstRun = (anyExisting[0]?.count ?? 0) === 0;
  const target = isFirstRun ? current : addMonths(current, 1);

  // Idempotency: if target already has any rows, refuse.
  const existingForTarget = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(monthlyEntries)
    .where(eq(monthlyEntries.month, target));
  if ((existingForTarget[0]?.count ?? 0) > 0) {
    return { ok: false, error: "already_generated" };
  }

  const templates = await activeTemplatesForMonth(target);
  if (templates.length === 0) {
    return { ok: false, error: "no_templates" };
  }

  await db.insert(monthlyEntries).values(
    templates.map((t) => ({
      recurringEntryId: t.id,
      month: target,
      nameSnapshot: t.name,
      categorySnapshot: t.category,
      dueDaySnapshot: t.dueDay,
      amount: t.defaultAmount,
      paid: false,
    })),
  );

  revalidatePath("/m/[month]", "page");
  return { ok: true, month: target, inserted: templates.length };
}
