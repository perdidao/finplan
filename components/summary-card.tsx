import { formatBRL } from "@/lib/money/brl";
import type {
  MonthSummary,
  MonthRow,
  MonthHistoryEntry,
} from "@/lib/server/month-view-queries";
import { classifyFarol } from "@/lib/farol/farol";

interface Props {
  summary: MonthSummary;
  rows: MonthRow[];
  history: MonthHistoryEntry[];
  thresholdPct: number;
}

const farolCssClass: Record<"green" | "yellow" | "red", string> = {
  green: "green",
  yellow: "amber",
  red: "red",
};

export function SummaryCard({ summary, rows, history, thresholdPct }: Props) {
  const farol = classifyFarol({
    despesas: summary.despesas,
    receitas: summary.receitas,
    thresholdPct,
  });

  const fixedCount = rows.filter((r) => r.categorySnapshot === "fixed_bill").length;
  const varCount = rows.filter((r) => r.categorySnapshot === "variable_bill").length;
  const incomeCount = rows.filter((r) => r.categorySnapshot === "income").length;

  const balText = `${summary.saldo < 0 ? "-" : ""}R$ ${Math.abs(summary.saldo).toLocaleString(
    "pt-BR",
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  )}`;

  const pendingCount = summary.totalCount - summary.paidCount;
  const pendingTotal = rows.reduce((acc, r) => {
    if (r.categorySnapshot === "income" || r.paid || r.amount === null) return acc;
    return acc + Number(r.amount);
  }, 0);


  const prev = history.length >= 2 ? history[history.length - 2] : null;
  const dPct = (cur: number, last: number) =>
    last !== 0 ? ((cur - last) / Math.abs(last)) * 100 : 0;
  const expDelta = prev ? dPct(summary.despesas, prev.despesas) : null;
  const incDelta = prev ? dPct(summary.receitas, prev.receitas) : null;
  const balDelta = prev ? dPct(summary.saldo, prev.saldo) : null;

  let farolPctNum = 0;
  if (summary.saldo < 0) {
    farolPctNum = summary.receitas > 0 ? (summary.saldo / summary.receitas) * 100 : -100;
  } else if (summary.receitas > 0) {
    farolPctNum = (summary.saldo / summary.receitas) * 100;
  }
  const farolFilled = Math.max(
    0,
    Math.min(1, summary.saldo > 0 && summary.receitas > 0 ? summary.saldo / summary.receitas : 0),
  );
  const ringR = 38;
  const ringC = 2 * Math.PI * ringR;
  const farolDash = `${farolFilled * ringC} ${ringC}`;
  const farolLabel: Record<"green" | "yellow" | "red", string> = {
    green: "Saudável",
    yellow: "Cautela",
    red: "Atenção",
  };

  return (
    <div className="summary">
      <div className="sumcard tint-sage">
        <div className="row-top">
          <div className="chip">
            <span className="chip-icon">↓</span>Despesas
          </div>
          <DeltaPill value={expDelta} invert />
        </div>
        <div className="value">{formatBRL(summary.despesas.toFixed(2))}</div>
        <div className="sub">
          {fixedCount} {fixedCount === 1 ? "fixa" : "fixas"} · {varCount}{" "}
          {varCount === 1 ? "variável" : "variáveis"}
        </div>
      </div>

      <div className="sumcard tint-butter">
        <div className="row-top">
          <div className="chip">
            <span className="chip-icon">↑</span>Receitas
          </div>
          <DeltaPill value={incDelta} />
        </div>
        <div className="value">{formatBRL(summary.receitas.toFixed(2))}</div>
        <div className="sub">
          {incomeCount} {incomeCount === 1 ? "fonte" : "fontes"}
        </div>
      </div>

      <div className="sumcard tint-lav">
        <div className="row-top">
          <div className="chip">
            <span className="chip-icon">$</span>Saldo
          </div>
          <DeltaPill value={balDelta} />
        </div>
        <div className={"value" + (summary.saldo < 0 ? " is-negative" : "")}>{balText}</div>
        <div className="sub">Receitas − Despesas</div>
      </div>

      <div className="sumcard tint-cream farol-card">
        <div className="row-top">
          <div className="chip">
            <span className="chip-icon">●</span>Farol
          </div>
          <span className={`farol-pill ${farolCssClass[farol]}`}>{farolLabel[farol]}</span>
        </div>
        <div className="farol-ring-wrap">
          <svg className="farol-ring" viewBox="0 0 96 96" aria-hidden>
            <circle className="track" cx="48" cy="48" r={ringR} fill="none" strokeWidth="10" />
            <circle
              className={`fill ${farolCssClass[farol]}`}
              cx="48"
              cy="48"
              r={ringR}
              fill="none"
              strokeWidth="10"
              strokeDasharray={farolDash}
              strokeLinecap="round"
              transform="rotate(-90 48 48)"
            />
          </svg>
          <div className="farol-center">
            <div>
              <div className="pct">{farolPctNum >= 0 ? `${farolPctNum.toFixed(0)}%` : "—"}</div>
              <div className="pct-lbl">margem</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sumcard tint-ink pag-card">
        <div className="row-top">
          <div className="chip">
            <span className="chip-icon">✓</span>Pagamentos
          </div>
        </div>
        <div className="pag-num">
          <span>{summary.paidCount}</span>
          <span className="of">/ {summary.totalCount}</span>
        </div>
        <div className="sub">
          {pendingCount} {pendingCount === 1 ? "pendente" : "pendentes"}
          {pendingCount > 0 ? ` · ${formatBRL(pendingTotal.toFixed(2))}` : ""}
        </div>
        {summary.totalCount > 0 && (
          <div className="pag-bars">
            {Array.from({ length: summary.totalCount }).map((_, i) => (
              <span key={i} className={"pag-bar" + (i < summary.paidCount ? " done" : "")} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DeltaPill({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value === null || !Number.isFinite(value)) return null;
  const good = invert ? value <= 0 : value >= 0;
  const sign = value >= 0 ? "+" : "";
  return (
    <span className={"delta" + (good ? "" : " neg")}>
      {sign}
      {value.toFixed(0)}%
    </span>
  );
}
