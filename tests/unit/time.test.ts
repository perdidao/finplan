import { describe, it, expect } from "vitest";
import {
  currentMonthInSP,
  monthFromString,
  monthToString,
  addMonths,
  isSameMonth,
  isMonthBefore,
  lastDayOfPreviousMonth,
} from "@/lib/time/month";

describe("month helpers (America/Sao_Paulo)", () => {
  it("currentMonthInSP returns the SP month even when UTC has rolled over", () => {
    // 2026-05-01T01:30:00Z is 2026-04-30 22:30 SP — still April there.
    const fakeNow = new Date("2026-05-01T01:30:00Z");
    expect(currentMonthInSP(fakeNow)).toBe("2026-04-01");
  });

  it("currentMonthInSP returns May when SP is May at boundary", () => {
    // 2026-05-01T05:00:00Z is 2026-05-01 02:00 SP — May.
    const fakeNow = new Date("2026-05-01T05:00:00Z");
    expect(currentMonthInSP(fakeNow)).toBe("2026-05-01");
  });

  it("monthFromString / monthToString round-trip", () => {
    expect(monthToString(monthFromString("2026-05-01"))).toBe("2026-05-01");
  });

  it("addMonths(+1) of May 2026 is June 2026", () => {
    expect(addMonths("2026-05-01", 1)).toBe("2026-06-01");
  });

  it("addMonths(-1) of January 2026 is December 2025", () => {
    expect(addMonths("2026-01-01", -1)).toBe("2025-12-01");
  });

  it("isSameMonth and isMonthBefore", () => {
    expect(isSameMonth("2026-05-01", "2026-05-01")).toBe(true);
    expect(isSameMonth("2026-05-01", "2026-06-01")).toBe(false);
    expect(isMonthBefore("2026-04-01", "2026-05-01")).toBe(true);
    expect(isMonthBefore("2026-05-01", "2026-05-01")).toBe(false);
  });

  it("lastDayOfPreviousMonth: May 2026 → 2026-04-30", () => {
    expect(lastDayOfPreviousMonth("2026-05-01")).toBe("2026-04-30");
  });

  it("lastDayOfPreviousMonth: March 2026 → 2026-02-28", () => {
    expect(lastDayOfPreviousMonth("2026-03-01")).toBe("2026-02-28");
  });

  it("lastDayOfPreviousMonth: March 2024 (leap) → 2024-02-29", () => {
    expect(lastDayOfPreviousMonth("2024-03-01")).toBe("2024-02-29");
  });
});
