"use client";

import { useState, useTransition, useEffect } from "react";
import { X } from "lucide-react";
import { addRecurringEntryAction } from "@/lib/server/add-entry";
import { parseBRL, formatBRL } from "@/lib/money/brl";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { Category } from "@/lib/server/recurring-queries";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetCategory: Category;
  month: string;
}

const TITLES: Record<Category, string> = {
  fixed_bill: "Nova despesa fixa",
  variable_bill: "Nova despesa variável",
  income: "Nova entrada",
};

export function AddEntryDialog({ open, onOpenChange, presetCategory, month }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [category, setCategory] = useState<Category>(presetCategory);
  const [name, setName] = useState("");
  const [amt, setAmt] = useState("");
  const [due, setDue] = useState("5");

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  const showDue = category === "fixed_bill";
  const previewAmount = amt.trim() ? formatBRL(parseBRL(amt)) : "R$ 0,00";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Nome é obrigatório.");
      return;
    }
    let parsedAmount: string | null = null;
    if (category !== "variable_bill" && amt.trim() !== "") {
      parsedAmount = parseBRL(amt);
      if (parsedAmount === null) {
        toast.error("Valor inválido.");
        return;
      }
    }
    let dueDay: number | null = null;
    if (category === "fixed_bill" && due.trim() !== "") {
      const n = parseInt(due, 10);
      if (!Number.isInteger(n) || n < 1 || n > 31) {
        toast.error("Vencimento deve estar entre 1 e 31.");
        return;
      }
      dueDay = n;
    }
    start(async () => {
      try {
        await addRecurringEntryAction({
          name: name.trim(),
          category,
          defaultAmount: parsedAmount,
          dueDay,
          effectiveFrom: month,
        });
        toast.success("Adicionado.");
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
          <h3>{TITLES[category]}</h3>
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
            <label>Categoria</label>
            <div className="seg">
              <button
                type="button"
                className={category === "fixed_bill" ? "active" : ""}
                onClick={() => setCategory("fixed_bill")}
              >
                Fixa
              </button>
              <button
                type="button"
                className={category === "variable_bill" ? "active" : ""}
                onClick={() => setCategory("variable_bill")}
              >
                Variável
              </button>
              <button
                type="button"
                className={category === "income" ? "active" : ""}
                onClick={() => setCategory("income")}
              >
                Entrada
              </button>
            </div>
          </div>

          <div className="field">
            <label>Nome</label>
            <input
              className="input"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={category === "income" ? "Ex.: Salário" : "Ex.: Aluguel"}
            />
          </div>

          {category !== "variable_bill" ? (
            <div className="field">
              <label>Valor padrão</label>
              <input
                className="input mono"
                value={amt}
                onChange={(e) => setAmt(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
              />
              <span className="helper">{previewAmount}</span>
            </div>
          ) : (
            <div className="field">
              <span className="helper">
                Despesas variáveis começam vazias. Você preenche o valor cada mês.
              </span>
            </div>
          )}

          {showDue ? (
            <div className="field">
              <label>Vencimento (dia do mês)</label>
              <input
                className="input mono"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                maxLength={2}
                inputMode="numeric"
                style={{ maxWidth: 100 }}
              />
              <span className="helper">Dia 1 a 31. O vencimento se repete todo mês.</span>
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
            {pending ? "Salvando..." : "Adicionar"}
          </button>
        </div>
      </form>
    </>
  );
}
