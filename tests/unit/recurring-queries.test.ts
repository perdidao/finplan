import { describe, it, expect } from "vitest";
import { pickActiveTemplates, type RecurringRow } from "@/lib/server/recurring-queries";

const r = (overrides: Partial<RecurringRow>): RecurringRow => ({
  id: overrides.id ?? "x",
  name: overrides.name ?? "X",
  category: overrides.category ?? "fixed_bill",
  defaultAmount: overrides.defaultAmount ?? null,
  dueDay: overrides.dueDay ?? null,
  effectiveFrom: overrides.effectiveFrom ?? "2026-01-01",
  effectiveTo: overrides.effectiveTo ?? null,
  sortOrder: overrides.sortOrder ?? 0,
});

describe("pickActiveTemplates", () => {
  it("includes templates whose effective_from <= month and effective_to is null", () => {
    const rows = [r({ id: "a", effectiveFrom: "2026-01-01" })];
    expect(pickActiveTemplates(rows, "2026-05-01").map((x) => x.id)).toEqual(["a"]);
  });

  it("includes templates whose window covers the month exactly at boundaries", () => {
    const rows = [
      r({ id: "a", effectiveFrom: "2026-05-01", effectiveTo: "2026-05-31" }),
    ];
    expect(pickActiveTemplates(rows, "2026-05-01").map((x) => x.id)).toEqual(["a"]);
  });

  it("excludes templates whose effective_from is after the month", () => {
    const rows = [r({ id: "a", effectiveFrom: "2026-06-01" })];
    expect(pickActiveTemplates(rows, "2026-05-01")).toEqual([]);
  });

  it("excludes templates whose effective_to is before the month", () => {
    const rows = [r({ id: "a", effectiveFrom: "2026-01-01", effectiveTo: "2026-04-30" })];
    expect(pickActiveTemplates(rows, "2026-05-01")).toEqual([]);
  });

  it("returns rows ordered by sortOrder ascending", () => {
    const rows = [
      r({ id: "b", sortOrder: 5 }),
      r({ id: "a", sortOrder: 1 }),
      r({ id: "c", sortOrder: 3 }),
    ];
    expect(pickActiveTemplates(rows, "2026-05-01").map((x) => x.id)).toEqual([
      "a",
      "c",
      "b",
    ]);
  });
});
