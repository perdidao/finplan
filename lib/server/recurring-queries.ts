import { db } from "@/lib/db/client";
import { recurringEntries } from "@/lib/db/schema";
import { and, asc, isNull, lte, or, gte } from "drizzle-orm";

export type Category = "fixed_bill" | "variable_bill" | "income";

export interface RecurringRow {
  id: string;
  name: string;
  category: Category;
  defaultAmount: string | null;
  dueDay: number | null;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo: string | null;
  sortOrder: number;
}

export function pickActiveTemplates(rows: RecurringRow[], month: string): RecurringRow[] {
  return rows
    .filter((r) => r.effectiveFrom <= month)
    .filter((r) => r.effectiveTo === null || r.effectiveTo >= month)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export async function listAllTemplates(): Promise<RecurringRow[]> {
  const rows = await db
    .select()
    .from(recurringEntries)
    .orderBy(asc(recurringEntries.sortOrder));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    defaultAmount: r.defaultAmount,
    dueDay: r.dueDay,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
    sortOrder: r.sortOrder,
  }));
}

export async function activeTemplatesForMonth(month: string): Promise<RecurringRow[]> {
  const rows = await db
    .select()
    .from(recurringEntries)
    .where(
      and(
        lte(recurringEntries.effectiveFrom, month),
        or(
          isNull(recurringEntries.effectiveTo),
          gte(recurringEntries.effectiveTo, month),
        ),
      ),
    )
    .orderBy(asc(recurringEntries.sortOrder));
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    category: r.category,
    defaultAmount: r.defaultAmount,
    dueDay: r.dueDay,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo,
    sortOrder: r.sortOrder,
  }));
}
