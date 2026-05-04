import { describe, it, expect } from "vitest";
import { buildEditFromNowOnPlan, type EditFromNowOnInput } from "@/lib/server/edit-plan";

const baseInput: EditFromNowOnInput = {
  oldTemplateId: "old",
  newTemplateId: "new",
  currentMonth: "2026-05-01",
  generatedFutureMonths: ["2026-05-01"],
  patch: {
    name: "Sanepar (novo)",
    category: "fixed_bill",
    defaultAmount: "150.00",
    dueDay: 9,
  },
  sortOrder: 3,
};

describe("buildEditFromNowOnPlan", () => {
  it("closes the old template, inserts the new template, and updates current month row", () => {
    const plan = buildEditFromNowOnPlan(baseInput);
    expect(plan.closeOldTemplate).toEqual({
      id: "old",
      effectiveTo: "2026-04-30",
    });
    expect(plan.insertNewTemplate).toEqual({
      id: "new",
      effectiveFrom: "2026-05-01",
      name: "Sanepar (novo)",
      category: "fixed_bill",
      defaultAmount: "150.00",
      dueDay: 9,
      sortOrder: 3,
    });
    expect(plan.updateRows).toEqual([
      {
        oldRecurringEntryId: "old",
        month: "2026-05-01",
        newRecurringEntryId: "new",
        nameSnapshot: "Sanepar (novo)",
        categorySnapshot: "fixed_bill",
        dueDaySnapshot: 9,
        amount: "150.00",
      },
    ]);
  });

  it("includes every already-generated future month for the same template", () => {
    const plan = buildEditFromNowOnPlan({
      ...baseInput,
      generatedFutureMonths: ["2026-05-01", "2026-06-01"],
    });
    expect(plan.updateRows.map((r) => r.month)).toEqual([
      "2026-05-01",
      "2026-06-01",
    ]);
  });

  it("rejects a current month earlier than the oldest generated future month", () => {
    expect(() =>
      buildEditFromNowOnPlan({
        ...baseInput,
        currentMonth: "2026-06-01",
        generatedFutureMonths: ["2026-05-01"],
      }),
    ).toThrow(/inconsistent/i);
  });
});
