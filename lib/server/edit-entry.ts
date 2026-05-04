"use server";

import { db } from "@/lib/db/client";
import { monthlyEntries, recurringEntries } from "@/lib/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { assertEditable } from "./freeze";
import { randomUUID } from "node:crypto";
import { buildEditFromNowOnPlan, type EntryPatch } from "./edit-plan";

export async function editJustThisMonthAction(args: {
  monthlyEntryId: string;
  month: string;
  amount: string | null;
  paid: boolean;
  notes: string | null;
}): Promise<void> {
  await assertEditable(args.month);
  await db
    .update(monthlyEntries)
    .set({
      amount: args.amount,
      paid: args.paid,
      paidAt: args.paid ? sql`now()` : null,
      notes: args.notes,
      updatedAt: sql`now()`,
    })
    .where(eq(monthlyEntries.id, args.monthlyEntryId));
  revalidatePath(`/m/${args.month}`);
}

export async function editFromNowOnAction(args: {
  oldTemplateId: string;
  currentMonth: string;
  patch: EntryPatch;
}): Promise<void> {
  await assertEditable(args.currentMonth);

  // Read the old template's sort_order so the new version preserves it.
  const oldTpl = await db
    .select({ sortOrder: recurringEntries.sortOrder })
    .from(recurringEntries)
    .where(eq(recurringEntries.id, args.oldTemplateId))
    .limit(1);
  if (oldTpl.length === 0) {
    throw new Error(`Template ${args.oldTemplateId} not found`);
  }

  // Fetch generated rows for this template at or after currentMonth.
  const futureRows = await db
    .select({ month: monthlyEntries.month })
    .from(monthlyEntries)
    .where(
      and(
        eq(monthlyEntries.recurringEntryId, args.oldTemplateId),
        gte(monthlyEntries.month, args.currentMonth),
      ),
    );

  const newId = randomUUID();
  const plan = buildEditFromNowOnPlan({
    oldTemplateId: args.oldTemplateId,
    newTemplateId: newId,
    currentMonth: args.currentMonth,
    generatedFutureMonths: futureRows.map((r) => r.month),
    patch: args.patch,
    sortOrder: oldTpl[0].sortOrder,
  });

  // Sequential statements; neon-http doesn't support multi-statement transactions.
  // Order: insert new template → update rows to point at new id → close old template.
  // No deletes are involved; partial failure leaves the system consistent.
  await db.insert(recurringEntries).values({
    id: plan.insertNewTemplate.id,
    name: plan.insertNewTemplate.name,
    category: plan.insertNewTemplate.category,
    defaultAmount: plan.insertNewTemplate.defaultAmount,
    dueDay: plan.insertNewTemplate.dueDay,
    sortOrder: plan.insertNewTemplate.sortOrder,
    effectiveFrom: plan.insertNewTemplate.effectiveFrom,
    effectiveTo: null,
  });

  for (const u of plan.updateRows) {
    await db
      .update(monthlyEntries)
      .set({
        recurringEntryId: u.newRecurringEntryId,
        nameSnapshot: u.nameSnapshot,
        categorySnapshot: u.categorySnapshot,
        dueDaySnapshot: u.dueDaySnapshot,
        amount: u.amount,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(monthlyEntries.recurringEntryId, u.oldRecurringEntryId),
          eq(monthlyEntries.month, u.month),
        ),
      );
  }

  await db
    .update(recurringEntries)
    .set({ effectiveTo: plan.closeOldTemplate.effectiveTo })
    .where(eq(recurringEntries.id, plan.closeOldTemplate.id));

  revalidatePath(`/m/${args.currentMonth}`);
  revalidatePath("/settings");
}
