"use server";

import { db } from "@/lib/db/client";
import { appSettings } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export interface AppSettings {
  farolGreenThresholdPct: number;
  freezeTrigger: "date_based" | "action_based";
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.id, 1)).limit(1);
  if (rows.length === 0) {
    await db.insert(appSettings).values({ id: 1 });
    return { farolGreenThresholdPct: 20, freezeTrigger: "date_based" };
  }
  return {
    farolGreenThresholdPct: rows[0].farolGreenThresholdPct,
    freezeTrigger: rows[0].freezeTrigger,
  };
}

export async function updateFarolThresholdAction(value: number): Promise<void> {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Farol threshold must be between 0 and 100.");
  }
  await db
    .update(appSettings)
    .set({ farolGreenThresholdPct: Math.round(value), updatedAt: sql`now()` })
    .where(eq(appSettings.id, 1));
  revalidatePath("/", "layout");
}

export async function updateFreezeTriggerAction(
  value: "date_based" | "action_based",
): Promise<void> {
  await db
    .update(appSettings)
    .set({ freezeTrigger: value, updatedAt: sql`now()` })
    .where(eq(appSettings.id, 1));
  revalidatePath("/", "layout");
}
