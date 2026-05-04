import { formatInTimeZone } from "date-fns-tz";

export const SP_TZ = "America/Sao_Paulo";

/** "YYYY-MM-01" string for the current month in São Paulo. */
export function currentMonthInSP(now: Date = new Date()): string {
  return formatInTimeZone(now, SP_TZ, "yyyy-MM-01");
}

/** Parse "YYYY-MM-01" into a UTC Date at 12:00Z (avoids any TZ slips). */
export function monthFromString(s: string): Date {
  if (!/^\d{4}-\d{2}-01$/.test(s)) {
    throw new Error(`Invalid month string: ${s} (expected YYYY-MM-01)`);
  }
  return new Date(`${s}T12:00:00Z`);
}

export function monthToString(d: Date): string {
  return formatInTimeZone(d, "UTC", "yyyy-MM-01");
}

export function addMonths(month: string, delta: number): string {
  const d = monthFromString(month);
  const next = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1, 12, 0, 0),
  );
  return monthToString(next);
}

export function isSameMonth(a: string, b: string): boolean {
  return a === b;
}

export function isMonthBefore(a: string, b: string): boolean {
  return monthFromString(a).getTime() < monthFromString(b).getTime();
}

/** "YYYY-MM-DD" of the last day of the month before `month`. */
export function lastDayOfPreviousMonth(month: string): string {
  const d = monthFromString(month);
  const prev = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0));
  // getUTCMonth() with day=0 gives the last day of the previous month.
  return formatInTimeZone(prev, "UTC", "yyyy-MM-dd");
}
