import { describe, it, expect } from "vitest";
import {
  summarizeMonth,
  groupByCategory,
  isMonthClosed,
  type MonthRow,
} from "@/lib/server/month-view-queries";

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

describe("isMonthClosed", () => {
  it("is closed when every payable bill is paid", () => {
    const rows: MonthRow[] = [
      row({ categorySnapshot: "fixed_bill", amount: "1000.00", paid: true }),
      row({ categorySnapshot: "variable_bill", amount: "300.00", paid: true }),
      row({ categorySnapshot: "income", amount: "2000.00", paid: false }),
    ];
    expect(isMonthClosed(summarizeMonth(rows))).toBe(true);
  });

  it("is open while any bill is unpaid (income is ignored)", () => {
    const rows: MonthRow[] = [
      row({ categorySnapshot: "fixed_bill", amount: "1000.00", paid: true }),
      row({ categorySnapshot: "variable_bill", amount: "300.00", paid: false }),
    ];
    expect(isMonthClosed(summarizeMonth(rows))).toBe(false);
  });

  it("is not closed when there are no payable bills", () => {
    const rows: MonthRow[] = [
      row({ categorySnapshot: "income", amount: "2000.00", paid: true }),
    ];
    expect(isMonthClosed(summarizeMonth(rows))).toBe(false);
  });
});

describe("groupByCategory", () => {
  it("sorts fixed bills by due day ascending, then by name", () => {
    const rows: MonthRow[] = [
      row({ id: "consorcio", nameSnapshot: "Consórcio", categorySnapshot: "fixed_bill", dueDaySnapshot: 15 }),
      row({ id: "aluguel", nameSnapshot: "Aluguel", categorySnapshot: "fixed_bill", dueDaySnapshot: 5 }),
      row({ id: "vivo", nameSnapshot: "Vivo", categorySnapshot: "fixed_bill", dueDaySnapshot: 10 }),
      row({ id: "sanepar", nameSnapshot: "Sanepar", categorySnapshot: "fixed_bill", dueDaySnapshot: 5 }),
    ];
    const grouped = groupByCategory(rows);
    expect(grouped.fixed.map((r) => r.id)).toEqual([
      "aluguel",
      "sanepar",
      "vivo",
      "consorcio",
    ]);
  });

  it("places fixed rows with null due day at the end", () => {
    const rows: MonthRow[] = [
      row({ id: "noday", nameSnapshot: "Sem dia", categorySnapshot: "fixed_bill", dueDaySnapshot: null }),
      row({ id: "early", nameSnapshot: "Early", categorySnapshot: "fixed_bill", dueDaySnapshot: 3 }),
    ];
    expect(groupByCategory(rows).fixed.map((r) => r.id)).toEqual(["early", "noday"]);
  });
});
