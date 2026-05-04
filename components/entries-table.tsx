"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/money/brl";
import type { MonthRow } from "@/lib/server/month-view-queries";
import type { Category } from "@/lib/server/recurring-queries";
import { InlineAmountCell } from "./inline-amount-cell";
import { PaidCheckboxCell } from "./paid-checkbox-cell";
import { RowActionMenu } from "./row-action-menu";
import { AddEntryDialog } from "./add-entry-dialog";

const KIND_TITLES: Record<Category, string> = {
  fixed_bill: "Despesas fixas",
  variable_bill: "Despesas variáveis",
  income: "Entradas",
};

const ADD_LABELS: Record<Category, string> = {
  fixed_bill: "+ Despesa fixa",
  variable_bill: "+ Despesa variável",
  income: "+ Entrada",
};

const KIND_DATA: Record<Category, "fixed" | "var" | "income"> = {
  fixed_bill: "fixed",
  variable_bill: "var",
  income: "income",
};

interface Props {
  category: Category;
  rows: MonthRow[];
  month: string;
  frozen: boolean;
}

export function EntriesTable({ category, rows, month, frozen }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const total = rows.reduce(
    (acc, r) => acc + (r.amount === null ? 0 : Number(r.amount)),
    0,
  );
  const isIncome = category === "income";
  const showDue = category === "fixed_bill";
  const paidCount = rows.filter((r) => r.paid).length;
  const metaLabel = isIncome ? "recebidas" : "pagas";

  return (
    <>
      <div
        className={`section${frozen ? " read-only" : ""}`}
        data-kind={KIND_DATA[category]}
      >
        <div className="section-head">
          <div className="section-title">
            <span className="swatch" />
            {KIND_TITLES[category]}
          </div>
          <div className="section-meta">
            {!isIncome ? (
              <span>
                <strong>{paidCount}</strong> / {rows.length} {metaLabel}
              </span>
            ) : null}
            <span className="mono">{formatBRL(total.toFixed(2))}</span>
          </div>
        </div>

        <div className="tbl-head">
          <div>Nome</div>
          <div className="col-amt">Valor</div>
          {showDue ? <div className="col-due">Venc.</div> : null}
          {!isIncome ? <div className="col-ok">ok</div> : null}
          <div className="col-act" />
        </div>

        <div className="tbl-rows">
          {rows.length === 0 ? (
            <div
              style={{
                padding: "20px var(--section-pad)",
                color: "var(--ink-4)",
                fontSize: 12.5,
                textAlign: "center",
              }}
            >
              Nenhum item.
            </div>
          ) : null}
          {rows.map((r) => (
            <div key={r.id} className={`tbl-row${r.paid ? " is-paid" : ""}`}>
              <div className="col-name">
                <span className="name-text" title={r.nameSnapshot}>
                  {r.nameSnapshot}
                </span>
              </div>
              <div className="col-amt">
                <InlineAmountCell
                  monthlyEntryId={r.id}
                  month={month}
                  amount={r.amount}
                  paid={r.paid}
                  disabled={frozen}
                />
              </div>
              {showDue ? (
                <div className="col-due">
                  {r.dueDaySnapshot != null ? (
                    <span className="day mono">
                      {String(r.dueDaySnapshot).padStart(2, "0")}
                    </span>
                  ) : (
                    <span style={{ opacity: 0.4 }}>—</span>
                  )}
                </div>
              ) : null}
              {!isIncome ? (
                <div className="col-ok">
                  <PaidCheckboxCell
                    monthlyEntryId={r.id}
                    month={month}
                    amount={r.amount}
                    paid={r.paid}
                    disabled={frozen}
                  />
                </div>
              ) : null}
              {!frozen ? (
                <RowActionMenu
                  monthlyEntryId={r.id}
                  recurringEntryId={r.recurringEntryId}
                  month={month}
                  row={r}
                />
              ) : (
                <div className="col-act" />
              )}
            </div>
          ))}
        </div>

        {!frozen ? (
          <button
            type="button"
            className="add-row-btn"
            onClick={() => setAddOpen(true)}
          >
            <span className="plus">+</span>
            {ADD_LABELS[category]}
          </button>
        ) : null}
      </div>
      {addOpen ? (
        <AddEntryDialog
          open
          onOpenChange={(v) => {
            if (!v) setAddOpen(false);
          }}
          presetCategory={category}
          month={month}
        />
      ) : null}
    </>
  );
}
