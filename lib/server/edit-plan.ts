import { lastDayOfPreviousMonth } from "@/lib/time/month";
import type { Category } from "./recurring-queries";

export interface EntryPatch {
  name: string;
  category: Category;
  defaultAmount: string | null;
  dueDay: number | null;
}

export interface EditFromNowOnInput {
  oldTemplateId: string;
  newTemplateId: string;
  currentMonth: string;
  generatedFutureMonths: string[]; // months at or after currentMonth that have rows for oldTemplateId
  patch: EntryPatch;
  sortOrder: number; // carried forward from the old template
}

export interface EditFromNowOnPlan {
  closeOldTemplate: { id: string; effectiveTo: string };
  insertNewTemplate: {
    id: string;
    effectiveFrom: string;
    name: string;
    category: Category;
    defaultAmount: string | null;
    dueDay: number | null;
    sortOrder: number;
  };
  updateRows: Array<{
    oldRecurringEntryId: string;
    month: string;
    newRecurringEntryId: string;
    nameSnapshot: string;
    categorySnapshot: Category;
    dueDaySnapshot: number | null;
    amount: string | null;
  }>;
}

export function buildEditFromNowOnPlan(input: EditFromNowOnInput): EditFromNowOnPlan {
  const earliestFuture = [...input.generatedFutureMonths].sort()[0];
  if (earliestFuture && earliestFuture < input.currentMonth) {
    throw new Error("inconsistent: generatedFutureMonths contains a month before currentMonth");
  }
  return {
    closeOldTemplate: {
      id: input.oldTemplateId,
      effectiveTo: lastDayOfPreviousMonth(input.currentMonth),
    },
    insertNewTemplate: {
      id: input.newTemplateId,
      effectiveFrom: input.currentMonth,
      name: input.patch.name,
      category: input.patch.category,
      defaultAmount: input.patch.defaultAmount,
      dueDay: input.patch.dueDay,
      sortOrder: input.sortOrder,
    },
    updateRows: input.generatedFutureMonths.map((m) => ({
      oldRecurringEntryId: input.oldTemplateId,
      month: m,
      newRecurringEntryId: input.newTemplateId,
      nameSnapshot: input.patch.name,
      categorySnapshot: input.patch.category,
      dueDaySnapshot: input.patch.dueDay,
      amount: input.patch.defaultAmount,
    })),
  };
}
