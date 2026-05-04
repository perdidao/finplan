"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import type { MonthRow } from "@/lib/server/month-view-queries";
import { EditEntryDialog } from "./edit-entry-dialog";
import { DeleteEntryDialog } from "./delete-entry-dialog";

interface Props {
  monthlyEntryId: string;
  recurringEntryId: string | null;
  month: string;
  row: MonthRow;
}

export function RowActionMenu({ monthlyEntryId, recurringEntryId, month, row }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  return (
    <>
      <div className="col-act" ref={ref}>
        <button
          className="act-btn"
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Ações"
        >
          <MoreVertical />
        </button>
        {menuOpen ? (
          <div className="act-menu">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setEditOpen(true);
              }}
            >
              Editar
            </button>
            <hr />
            <button
              type="button"
              className="danger"
              onClick={() => {
                setMenuOpen(false);
                setDelOpen(true);
              }}
            >
              Excluir
            </button>
          </div>
        ) : null}
      </div>
      <EditEntryDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        monthlyEntryId={monthlyEntryId}
        recurringEntryId={recurringEntryId}
        month={month}
        row={row}
      />
      <DeleteEntryDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        monthlyEntryId={monthlyEntryId}
        recurringEntryId={recurringEntryId}
        month={month}
        row={row}
      />
    </>
  );
}
