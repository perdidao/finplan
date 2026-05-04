"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { editJustThisMonthAction } from "@/lib/server/edit-entry";
import { toast } from "sonner";

interface Props {
  monthlyEntryId: string;
  month: string;
  amount: string | null;
  paid: boolean;
  disabled?: boolean;
}

export function PaidCheckboxCell({ monthlyEntryId, month, amount, paid, disabled }: Props) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="check"
      disabled={disabled || pending}
      aria-label={paid ? "Marcar como não pago" : "Marcar como pago"}
      onClick={() => {
        const next = !paid;
        start(async () => {
          try {
            await editJustThisMonthAction({
              monthlyEntryId,
              month,
              amount,
              paid: next,
              notes: null,
            });
          } catch (err) {
            toast.error(err instanceof Error ? err.message : "Erro ao atualizar");
          }
        });
      }}
    >
      <Check />
    </button>
  );
}
