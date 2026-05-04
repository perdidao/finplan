import { formatBRL } from "@/lib/money/brl";
import type { MonthSummary, MonthRow } from "@/lib/server/month-view-queries";
import { classifyFarol } from "@/lib/farol/farol";
import { FarolDisc } from "./farol-indicator";

interface Props {
  summary: MonthSummary;
  rows: MonthRow[];
  thresholdPct: number;
}

export function SummaryCard({ summary, rows, thresholdPct }: Props) {
  const farol = classifyFarol({
    despesas: summary.despesas,
    receitas: summary.receitas,
    thresholdPct,
  });

  const fixedCount = rows.filter((r) => r.categorySnapshot === "fixed_bill").length;
  const varCount = rows.filter((r) => r.categorySnapshot === "variable_bill").length;
  const incomeCount = rows.filter((r) => r.categorySnapshot === "income").length;

  const balCls = summary.saldo < 0 ? "is-negative" : "is-positive";
  const balText = `${summary.saldo < 0 ? "-" : ""}R$ ${Math.abs(summary.saldo).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const segs = Math.min(summary.totalCount, 12) || 1;
  const filled = summary.totalCount
    ? Math.round((summary.paidCount / summary.totalCount) * segs)
    : 0;

  let farolLabel: string;
  if (summary.saldo < 0) {
    farolLabel = "Despesas excedem receitas";
  } else if (summary.receitas > 0) {
    const pct = (summary.saldo / summary.receitas) * 100;
    farolLabel = `${pct.toFixed(0)}% de margem`;
  } else {
    farolLabel = "Sem receitas";
  }

  const pendingCount = summary.totalCount - summary.paidCount;

  return (
    <div className="summary">
      <div className="sumcell expense">
        <div className="label">Despesas</div>
        <div className="value">{formatBRL(summary.despesas.toFixed(2))}</div>
        <div className="sub">
          {fixedCount} {fixedCount === 1 ? "fixa" : "fixas"} · {varCount} {varCount === 1 ? "variável" : "variáveis"}
        </div>
      </div>
      <div className="sumcell income">
        <div className="label">Receitas</div>
        <div className="value">{formatBRL(summary.receitas.toFixed(2))}</div>
        <div className="sub">
          {incomeCount} {incomeCount === 1 ? "fonte" : "fontes"}
        </div>
      </div>
      <div className="sumcell balance">
        <div className="label">Saldo</div>
        <div className={`value ${balCls}`}>{balText}</div>
        <div className="sub">Receitas − Despesas</div>
      </div>
      <div className="sumcell farol-cell">
        <div className="label">Farol</div>
        <FarolDisc color={farol} />
        <div className="sub">{farolLabel}</div>
      </div>
      <div className="sumcell pagamentos">
        <div className="label">Pagamentos</div>
        <div className="pagamentos-value">
          <span>{summary.paidCount}</span>
          <span className="pag-of">/ {summary.totalCount}</span>
        </div>
        <div className="pagamentos-bar">
          {Array.from({ length: segs }).map((_, i) => (
            <span key={i} className={i < filled ? "done" : ""} />
          ))}
        </div>
        <div className="sub">
          {pendingCount} {pendingCount === 1 ? "pendente" : "pendentes"}
        </div>
      </div>
    </div>
  );
}
