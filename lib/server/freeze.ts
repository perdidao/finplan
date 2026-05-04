import { db } from "@/lib/db/client";
import { monthlyEntries } from "@/lib/db/schema";
import { gt } from "drizzle-orm";
import { currentMonthInSP, isMonthBefore } from "@/lib/time/month";
import { getSettings } from "./settings";

export async function isMonthFrozen(month: string): Promise<boolean> {
  const settings = await getSettings();
  if (settings.freezeTrigger === "date_based") {
    return isMonthBefore(month, currentMonthInSP());
  }
  // action_based: frozen iff any later month exists in monthly_entries
  const laterRow = await db
    .select({ id: monthlyEntries.id })
    .from(monthlyEntries)
    .where(gt(monthlyEntries.month, month))
    .limit(1);
  return laterRow.length > 0;
}

export async function assertEditable(month: string): Promise<void> {
  if (await isMonthFrozen(month)) {
    throw new Error(`Mês ${month} está fechado e não pode ser editado.`);
  }
}
