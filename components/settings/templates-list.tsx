import { formatBRL } from "@/lib/money/brl";
import type { RecurringRow } from "@/lib/server/recurring-queries";
import { currentMonthInSP } from "@/lib/time/month";

const KIND_LABELS: Record<RecurringRow["category"], string> = {
  fixed_bill: "Fixa",
  variable_bill: "Variável",
  income: "Entrada",
};

const KIND_ORDER: Record<RecurringRow["category"], number> = {
  fixed_bill: 0,
  variable_bill: 1,
  income: 2,
};

export function TemplatesList({ rows }: { rows: RecurringRow[] }) {
  const today = currentMonthInSP();
  const sorted = [...rows].sort((a, b) => {
    const order = KIND_ORDER[a.category] - KIND_ORDER[b.category];
    if (order !== 0) return order;
    return a.name.localeCompare(b.name, "pt-BR");
  });

  return (
    <table className="tpl-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Tipo</th>
          <th className="right">Valor</th>
          <th className="right">Venc.</th>
          <th className="right">Início</th>
          <th className="right">Fim</th>
        </tr>
      </thead>
      <tbody>
        {sorted.length === 0 ? (
          <tr>
            <td colSpan={6} style={{ textAlign: "center", color: "var(--ink-4)" }}>
              Nenhum template ainda.
            </td>
          </tr>
        ) : null}
        {sorted.map((t) => {
          const ended = t.effectiveTo !== null && t.effectiveTo < today;
          return (
            <tr key={t.id} className={ended ? "ended" : ""}>
              <td>
                <span className="name-text">{t.name}</span>
              </td>
              <td>
                <span className="kind-pill">{KIND_LABELS[t.category]}</span>
              </td>
              <td className="right mono">{formatBRL(t.defaultAmount)}</td>
              <td className="right mono">
                {t.dueDay != null ? String(t.dueDay).padStart(2, "0") : "—"}
              </td>
              <td className="right mono">{t.effectiveFrom}</td>
              <td className="right mono">{t.effectiveTo ?? "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
