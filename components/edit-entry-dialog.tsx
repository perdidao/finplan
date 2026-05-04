"use client";

import { useState, useEffect, useTransition } from "react";
import { X } from "lucide-react";
import {
  editJustThisMonthAction,
  editFromNowOnAction,
} from "@/lib/server/edit-entry";
import { parseBRL, formatBRL } from "@/lib/money/brl";
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

const KIND_TITLES: Record<MonthRow["categorySnapshot"], string> = {
  fixed_bill: "Editar despesa fixa",
  variable_bill: "Editar despesa variável",
  income: "Editar entrada",
};

export function EditEntryDialog({
  open,
  onOpenChange,
  monthlyEntryId,
  recurringEntryId,
  month,
  row,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(row.nameSnapshot);
  const [amt, setAmt] = useState(amountToInputValue(row.amount));
  const [due, setDue] = useState(
    row.dueDaySnapshot != null ? String(row.dueDaySnapshot) : "5",
  );
  const [scope, setScope] = useState<"this" | "forward">("forward");

  useEffect(() => {
    if (!open) return;
    setName(row.nameSnapshot);
    setAmt(amountToInputValue(row.amount));
    setDue(row.dueDaySnapshot != null ? String(row.dueDaySnapshot) : "5");
    setScope("forward");
  }, [open, row]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  const isRecurring = !!recurringEntryId;
  const showDue = row.categorySnapshot === "fixed_bill";
  const showAmount = row.categorySnapshot !== "variable_bill" || scope === "this";
  const [year, m] = month.split("-").map(Number);
  const monthLabel = `${MONTHS_PT[m - 1]} ${year}`;
  const previewAmount = amt.trim() ? formatBRL(parseBRL(amt)) : "R$ 0,00";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    const parsedAmount = amt.trim() === "" ? null : parseBRL(amt);
    if (amt.trim() !== "" && parsedAmount === null) {
      toast.error("Valor inválido.");
      return;
    }
    let dueDay: number | null = null;
    if (showDue) {
      if (due.trim() === "") {
        dueDay = null;
      } else {
        const n = parseInt(due, 10);
        if (!Number.isInteger(n) || n < 1 || n > 31) {
          toast.error("Vencimento deve estar entre 1 e 31.");
          return;
        }
        dueDay = n;
      }
    }

    start(async () => {
      try {
        if (!isRecurring || scope === "this") {
          await editJustThisMonthAction({
            monthlyEntryId,
            month,
            amount: parsedAmount,
            paid: row.paid,
            notes: null,
          });
          toast.success(`Salvo apenas em ${monthLabel}.`);
        } else {
          await editFromNowOnAction({
            oldTemplateId: recurringEntryId!,
            currentMonth: month,
            patch: {
              name: name.trim(),
              category: row.categorySnapshot,
              defaultAmount:
                row.categorySnapshot === "variable_bill" ? null : parsedAmount,
              dueDay,
            },
          });
          toast.success("Salvo daqui em diante.");
        }
        onOpenChange(false);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar");
      }
    });
  }

  return (
    <>
      <div className="drawer-backdrop" onClick={() => onOpenChange(false)} />
      <form className="drawer" onSubmit={submit}>
        <div className="drawer-head">
          <h3>{KIND_TITLES[row.categorySnapshot]}</h3>
          <button
            type="button"
            className="drawer-close"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
          >
            <X />
          </button>
        </div>
        <div className="drawer-body">
          <div className="field">
            <label>Nome</label>
            <input
              className="input"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isRecurring && scope === "this"}
            />
            {isRecurring && scope === "this" ? (
              <span className="helper">
                Para renomear use &quot;A partir de agora&quot;.
              </span>
            ) : null}
          </div>

          {showAmount ? (
            <div className="field">
              <label>Valor</label>
              <input
                className="input mono"
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
              <span className="helper">{previewAmount}</span>
            </div>
          ) : null}

          {showDue ? (
            <div className="field">
              <label>Vencimento (dia do mês)</label>
              <input
                className="input mono"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                disabled={isRecurring && scope === "this"}
                maxLength={2}
                inputMode="numeric"
                style={{ maxWidth: 100 }}
              />
            </div>
          ) : null}

          {isRecurring ? (
            <div className="field">
              <label>Aplicar mudança</label>
              <div className="scope-options">
                <div
                  className={`scope-opt${scope === "this" ? " active" : ""}`}
                  onClick={() => setScope("this")}
                >
                  <div className="radio" />
                  <div className="scope-text">
                    <div className="scope-title">Apenas este mês</div>
                    <div className="scope-sub">
                      {monthLabel} — outros meses não mudam.
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
                      Atualiza o template e todos os meses futuros.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        <div className="drawer-foot">
          <button
            type="button"
            className="btn"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </button>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </>
  );
}

function amountToInputValue(amount: string | null): string {
  if (amount === null) return "";
  return amount.replace(".", ",");
}
