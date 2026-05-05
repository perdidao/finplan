import { db } from "@/lib/db/client";
import { monthlyEntries } from "@/lib/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import type { Category } from "@/lib/server/recurring-queries";
import { addMonths } from "@/lib/time/month";

export interface MonthRow {
  id: string;
  recurringEntryId: string | null;
  month: string;
  nameSnapshot: string;
  categorySnapshot: Category;
  dueDaySnapshot: number | null;
  amount: string | null;
  paid: boolean;
}

export interface MonthSummary {
  despesas: number;
  receitas: number;
  saldo: number;
  paidCount: number;
  totalCount: number;
}

export async function fetchMonthRows(month: string): Promise<MonthRow[]> {
  const rows = await db
    .select()
    .from(monthlyEntries)
    .where(eq(monthlyEntries.month, month))
    .orderBy(asc(monthlyEntries.categorySnapshot), asc(monthlyEntries.nameSnapshot));
  return rows.map((r) => ({
    id: r.id,
    recurringEntryId: r.recurringEntryId,
    month: r.month,
    nameSnapshot: r.nameSnapshot,
    categorySnapshot: r.categorySnapshot,
    dueDaySnapshot: r.dueDaySnapshot,
    amount: r.amount,
    paid: r.paid,
  }));
}

export function summarizeMonth(rows: MonthRow[]): MonthSummary {
  let despesas = 0;
  let receitas = 0;
  let paidCount = 0;
  let totalCount = 0;
  for (const r of rows) {
    const amount = r.amount === null ? 0 : Number(r.amount);
    if (r.categorySnapshot === "income") {
      receitas += amount;
    } else {
      despesas += amount;
      totalCount += 1;
      if (r.paid) paidCount += 1;
    }
  }
  return { despesas, receitas, saldo: receitas - despesas, paidCount, totalCount };
}

export interface MonthHistoryEntry {
  month: string;
  despesas: number;
  receitas: number;
  saldo: number;
  paidCount: number;
  totalCount: number;
}

export async function fetchRecentSummaries(
  currentMonth: string,
  count: number,
): Promise<MonthHistoryEntry[]> {
  const months: string[] = [];
  for (let i = count - 1; i >= 0; i--) months.push(addMonths(currentMonth, -i));

  const rows = await db
    .select()
    .from(monthlyEntries)
    .where(inArray(monthlyEntries.month, months));

  const byMonth = new Map<string, MonthRow[]>();
  for (const m of months) byMonth.set(m, []);
  for (const r of rows) {
    const list = byMonth.get(r.month);
    if (!list) continue;
    list.push({
      id: r.id,
      recurringEntryId: r.recurringEntryId,
      month: r.month,
      nameSnapshot: r.nameSnapshot,
      categorySnapshot: r.categorySnapshot,
      dueDaySnapshot: r.dueDaySnapshot,
      amount: r.amount,
      paid: r.paid,
    });
  }

  return months.map((m) => {
    const s = summarizeMonth(byMonth.get(m) ?? []);
    return { month: m, ...s };
  });
}

export function groupByCategory(rows: MonthRow[]): {
  fixed: MonthRow[];
  variable: MonthRow[];
  income: MonthRow[];
} {
  return {
    fixed: rows
      .filter((r) => r.categorySnapshot === "fixed_bill")
      .sort((a, b) => {
        const aDue = a.dueDaySnapshot ?? 99;
        const bDue = b.dueDaySnapshot ?? 99;
        if (aDue !== bDue) return aDue - bDue;
        return a.nameSnapshot.localeCompare(b.nameSnapshot, "pt-BR");
      }),
    variable: rows.filter((r) => r.categorySnapshot === "variable_bill"),
    income: rows.filter((r) => r.categorySnapshot === "income"),
  };
}
