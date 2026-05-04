"use client";

import type { MonthRow } from "@/lib/server/month-view-queries";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthlyEntryId: string;
  recurringEntryId: string | null;
  month: string;
  row: MonthRow;
}

export function DeleteEntryDialog(_: Props) {
  return null;
}
