"use server";

import { db } from "@/lib/db/client";
import { monthlyEntries, recurringEntries } from "@/lib/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { lastDayOfPreviousMonth } from "@/lib/time/month";
import { assertEditable } from "./freeze";

export async function deleteJustThisMonthAction(args: {
  monthlyEntryId: string;
  month: string;
}): Promise<void> {
  await assertEditable(args.month);
  await db.delete(monthlyEntries).where(eq(monthlyEntries.id, args.monthlyEntryId));
  revalidatePath(`/m/${args.month}`);
}

export async function deleteFromNowOnAction(args: {
  recurringEntryId: string;
  currentMonth: string;
}): Promise<void> {
  await assertEditable(args.currentMonth);
  await db
    .delete(monthlyEntries)
    .where(
      and(
        eq(monthlyEntries.recurringEntryId, args.recurringEntryId),
        gte(monthlyEntries.month, args.currentMonth),
      ),
    );
  await db
    .update(recurringEntries)
    .set({ effectiveTo: lastDayOfPreviousMonth(args.currentMonth) })
    .where(eq(recurringEntries.id, args.recurringEntryId));
  revalidatePath(`/m/${args.currentMonth}`);
  revalidatePath("/settings");
}
