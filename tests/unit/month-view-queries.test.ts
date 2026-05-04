import { describe, it, expect } from "vitest";
import { summarizeMonth, type MonthRow } from "@/lib/server/month-view-queries";

const row = (over: Partial<MonthRow>): MonthRow => ({
  id: over.id ?? "id",
  recurringEntryId: over.recurringEntryId ?? null,
  month: over.month ?? "2026-05-01",
  nameSnapshot: over.nameSnapshot ?? "X",
  categorySnapshot: over.categorySnapshot ?? "fixed_bill",
  dueDaySnapshot: over.dueDaySnapshot ?? null,
  amount: over.amount ?? null,
  paid: over.paid ?? false,
});

describe("summarizeMonth", () => {
  it("computes despesas / receitas / saldo / pagamentos", () => {
    const rows: MonthRow[] = [
      row({ categorySnapshot: "fixed_bill", amount: "1000.00", paid: true }),
      row({ categorySnapshot: "fixed_bill", amount: "500.00", paid: false }),
      row({ categorySnapshot: "variable_bill", amount: "300.00", paid: false }),
      row({ categorySnapshot: "income", amount: "2000.00", paid: true }),
    ];
    const s = summarizeMonth(rows);
    expect(s.despesas).toBe(1800);
    expect(s.receitas).toBe(2000);
    expect(s.saldo).toBe(200);
    expect(s.paidCount).toBe(1); // 1 of 3 bills/cards paid; income not counted
    expect(s.totalCount).toBe(3);
  });

  it("treats null amounts as 0 in despesas, but doesn't count them as paid", () => {
    const rows: MonthRow[] = [
      row({ categorySnapshot: "variable_bill", amount: null, paid: false }),
      row({ categorySnapshot: "income", amount: "100.00", paid: true }),
    ];
    const s = summarizeMonth(rows);
    expect(s.despesas).toBe(0);
    expect(s.receitas).toBe(100);
    expect(s.saldo).toBe(100);
    expect(s.paidCount).toBe(0);
    expect(s.totalCount).toBe(1);
  });
});
