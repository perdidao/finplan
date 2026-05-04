"use client";

import { useState } from "react";
import { AddEntryDialog } from "./add-entry-dialog";

export function EmptyState({ month }: { month: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="empty-state">
      <div className="es-mark">F</div>
      <h2>Bem-vindo ao Finplan</h2>
      <p>Adicione sua primeira despesa fixa para começar a planejar o mês.</p>
      <button type="button" className="es-cta" onClick={() => setOpen(true)}>
        + Adicionar primeira despesa fixa
      </button>
      {open ? (
        <AddEntryDialog
          open
          onOpenChange={(v) => {
            if (!v) setOpen(false);
          }}
          presetCategory="fixed_bill"
          month={month}
        />
      ) : null}
    </div>
  );
}
