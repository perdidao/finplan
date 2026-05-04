"use client";

import type { Category } from "@/lib/server/recurring-queries";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetCategory: Category;
  month: string;
}

export function AddEntryDialog(_: Props) {
  return null;
}
