import { db } from "@/lib/db/client";
import { monthlyEntries } from "@/lib/db/schema";
import { asc, eq, inArray, sql } from "drizzle-orm";
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

/**
 * A month is "closed" once it has at least one payable (non-income) entry and
 * every one of them is paid. Closure is derived, not stored — un-paying a bill
 * reopens the month automatically.
 */
export function isMonthClosed(summary: MonthSummary): boolean {
  return summary.totalCount > 0 && summary.paidCount === summary.totalCount;
}

/**
 * Picks the month to open on launch: the earliest month with data that isn't
 * closed (so closed months are skipped forward to the next open one). If every
 * month with data is closed, returns the latest. Returns null when there's no
 * data at all.
 */
export async function resolveLandingMonth(): Promise<string | null> {
  const rows = await db
    .select({
      month: monthlyEntries.month,
      total: sql<number>`count(*) filter (where ${monthlyEntries.categorySnapshot} <> 'income')::int`,
      paid: sql<number>`count(*) filter (where ${monthlyEntries.categorySnapshot} <> 'income' and ${monthlyEntries.paid})::int`,
    })
    .from(monthlyEntries)
    .groupBy(monthlyEntries.month)
    .orderBy(asc(monthlyEntries.month));

  if (rows.length === 0) return null;
  for (const r of rows) {
    const closed = r.total > 0 && r.total === r.paid;
    if (!closed) return r.month;
  }
  return rows[rows.length - 1].month;
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
