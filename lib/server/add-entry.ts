"use server";

import { db } from "@/lib/db/client";
import { monthlyEntries, recurringEntries } from "@/lib/db/schema";
import { gte, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { Category } from "./recurring-queries";

const AddEntrySchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(["fixed_bill", "variable_bill", "income"]),
  defaultAmount: z.string().nullable(),
  dueDay: z.number().int().min(1).max(31).nullable(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-01$/),
});

export async function addRecurringEntryAction(input: unknown): Promise<{ id: string }> {
  const parsed = AddEntrySchema.parse(input);

  // Disallow defaultAmount on variable_bill.
  const defaultAmount =
    parsed.category === "variable_bill" ? null : parsed.defaultAmount;
  // Only fixed_bill keeps a due day.
  const dueDay = parsed.category === "fixed_bill" ? parsed.dueDay : null;

  // Pick a sort_order: max existing within the same category + 1.
  const maxRow = await db
    .select({ maxSort: sql<number>`coalesce(max(${recurringEntries.sortOrder}), 0)::int` })
    .from(recurringEntries)
    .where(eq(recurringEntries.category, parsed.category));
  const sortOrder = (maxRow[0]?.maxSort ?? 0) + 1;

  const id = randomUUID();
  await db.insert(recurringEntries).values({
    id,
    name: parsed.name,
    category: parsed.category,
    defaultAmount,
    dueDay,
    sortOrder,
    effectiveFrom: parsed.effectiveFrom,
    effectiveTo: null,
  });

  // Backfill: for every already-generated month at or after effective_from,
  // insert a corresponding monthly_entries row.
  const generatedMonths = await db
    .select({ month: monthlyEntries.month })
    .from(monthlyEntries)
    .where(gte(monthlyEntries.month, parsed.effectiveFrom))
    .groupBy(monthlyEntries.month);

  if (generatedMonths.length > 0) {
    await db.insert(monthlyEntries).values(
      generatedMonths.map((g) => ({
        recurringEntryId: id,
        month: g.month,
        nameSnapshot: parsed.name,
        categorySnapshot: parsed.category as Category,
        dueDaySnapshot: dueDay,
        amount: defaultAmount,
        paid: false,
      })),
    );
  }

  revalidatePath("/m/[month]", "page");
  revalidatePath("/settings");
  return { id };
}
