"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { formatBRL, parseBRL } from "@/lib/money/brl";
import { editJustThisMonthAction } from "@/lib/server/edit-entry";
import { toast } from "sonner";

interface Props {
  monthlyEntryId: string;
  month: string;
  amount: string | null;
  paid: boolean;
  disabled?: boolean;
}

export function InlineAmountCell({ monthlyEntryId, month, amount, paid, disabled }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(() => amountToInputValue(amount));
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(amountToInputValue(amount));
  }, [amount, editing]);

  function startEdit() {
    if (disabled) return;
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }

  function commit() {
    setEditing(false);
    const parsed = draft.trim() === "" ? null : parseBRL(draft);
    if (draft.trim() !== "" && parsed === null) {
      toast.error("Valor inválido");
      setDraft(amountToInputValue(amount));
      return;
    }
    if (parsed === amount) return;
    start(async () => {
      try {
        await editJustThisMonthAction({
          monthlyEntryId,
          month,
          amount: parsed,
          paid,
          notes: null,
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erro ao salvar");
      }
    });
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="amt-input mono"
        value={draft}
        disabled={pending}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") inputRef.current?.blur();
          if (e.key === "Escape") {
            setDraft(amountToInputValue(amount));
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <input
      className="amt-input mono"
      value={formatBRL(amount)}
      disabled={disabled}
      readOnly
      tabIndex={disabled ? -1 : 0}
      onFocus={startEdit}
      onClick={startEdit}
    />
  );
}

function amountToInputValue(amount: string | null): string {
  if (amount === null) return "";
  // Convert "1900.00" → "1900,00" for BR-style editing.
  return amount.replace(".", ",");
}
