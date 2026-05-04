"use client";

import { useEffect, useState, useTransition } from "react";
import {
  deleteJustThisMonthAction,
  deleteFromNowOnAction,
} from "@/lib/server/delete-entry";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { MonthRow } from "@/lib/server/month-view-queries";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthlyEntryId: string;
  recurringEntryId: string | null;
  month: string;
  row: MonthRow;
}

const MONTHS_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function DeleteEntryDialog({
  open,
  onOpenChange,
  monthlyEntryId,
  recurringEntryId,
  month,
  row,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const isRecurring = !!recurringEntryId;
  const [scope, setScope] = useState<"this" | "forward">(
    isRecurring ? "forward" : "this",
  );

  useEffect(() => {
    if (!open) return;
    setScope(isRecurring ? "forward" : "this");
  }, [open, isRecurring]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  const [year, m] = month.split("-").map(Number);
  const monthLabel = `${MONTHS_PT[m - 1]} ${year}`;

  function confirm() {
    start(async () => {
      try {
        if (!isRecurring || scope === "this") {
          await deleteJustThisMonthAction({ monthlyEntryId, month });
          toast.success(`Removido em ${monthLabel}.`);
        } else {
          await deleteFromNowOnAction({
            recurringEntryId: recurringEntryId!,
            currentMonth: month,
          });
          toast.success("Removido daqui em diante.");
        }
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao excluir");
      }
    });
  }

  return (
    <div
      className="dialog-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div className="dialog">
        <h3>Excluir &quot;{row.nameSnapshot}&quot;?</h3>
        <p>Esta ação não pode ser desfeita pelo histórico.</p>
        {isRecurring ? (
          <div className="scope-options">
            <div
              className={`scope-opt${scope === "this" ? " active" : ""}`}
              onClick={() => setScope("this")}
            >
              <div className="radio" />
              <div className="scope-text">
                <div className="scope-title">Apenas este mês</div>
                <div className="scope-sub">
                  Some de {monthLabel}; volta nos próximos.
                </div>
              </div>
            </div>
            <div
              className={`scope-opt${scope === "forward" ? " active" : ""}`}
              onClick={() => setScope("forward")}
            >
              <div className="radio" />
              <div className="scope-text">
                <div className="scope-title">A partir de agora</div>
                <div className="scope-sub">
                  Encerra o template — não aparece mais nos próximos meses.
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="dialog-foot">
          <button
            type="button"
            className="btn"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn danger"
            onClick={confirm}
            disabled={pending}
          >
            {pending ? "Excluindo..." : "Excluir"}
          </button>
        </div>
      </div>
    </div>
  );
}
