"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/money/brl";
import type { MonthHistoryEntry } from "@/lib/server/month-view-queries";
import { classifyFarol, type FarolColor } from "@/lib/farol/farol";

interface Props {
  history: MonthHistoryEntry[];
  currentMonth: string;
  thresholdPct: number;
}

const MONTHS_PT_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

const farolCssClass: Record<FarolColor, string> = {
  green: "green",
  yellow: "amber",
  red: "red",
};

const PAD_TOP = 0.12;
const PAD_BOTTOM = 0.12;
const PAD_X = 0.04;

function fmtK(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(0)}k`;
  return String(Math.round(n));
}

function shortMonth(monthKey: string): string {
  const m = Number(monthKey.slice(5, 7));
  return MONTHS_PT_SHORT[m - 1] ?? "";
}

export function SaldoChart({ history, currentMonth, thresholdPct }: Props) {
  const [expanded, setExpanded] = useState(false);
  if (history.length === 0) return null;

  const saldos = history.map((h) => h.saldo);
  const rawMin = Math.min(0, ...saldos);
  const rawMax = Math.max(0, ...saldos);
  const range = rawMax - rawMin || 1;

  // Normalized 0..1 vertical position with padding (0 = top, 1 = bottom).
  const yPos = (saldo: number) => {
    const t = (saldo - rawMin) / range; // 0..1, 0 = bottom
    return 1 - (PAD_BOTTOM + t * (1 - PAD_TOP - PAD_BOTTOM));
  };
  const zeroPos = rawMin < 0 ? yPos(0) : null;

  const xPos = (i: number) =>
    history.length === 1
      ? 0.5
      : PAD_X + (i / (history.length - 1)) * (1 - 2 * PAD_X);
  const points = history.map((h, i) => ({
    h,
    x: xPos(i),
    y: yPos(h.saldo),
    isCurrent: h.month === currentMonth,
    level: classifyFarol({
      despesas: h.despesas,
      receitas: h.receitas,
      thresholdPct,
    }),
  }));

  const linePath = points
    .map((p, i) => `${i ? "L" : "M"} ${(p.x * 100).toFixed(2)} ${(p.y * 100).toFixed(2)}`)
    .join(" ");
  const areaPath =
    points.length >= 2
      ? `${linePath} L ${(points[points.length - 1].x * 100).toFixed(2)} 100 L ${(points[0].x * 100).toFixed(2)} 100 Z`
      : null;

  const yTicks = [rawMax, rawMax - range * 0.25, rawMax - range * 0.5, rawMax - range * 0.75, rawMin];

  return (
    <div className={"saldo-chart" + (expanded ? "" : " is-compact")}>
      <div className="chart-head">
        <div>
          <h2>Saldo mês a mês</h2>
          {expanded && (
            <div className="sub2">
              Receitas − Despesas, últimos {history.length} meses · cor do ponto = farol do mês
            </div>
          )}
        </div>
        {expanded && (
          <div className="chart-legend">
            <span className="li">
              <span className="swatch" style={{ background: "var(--green)" }} />
              Saudável
            </span>
            <span className="li">
              <span className="swatch" style={{ background: "var(--amber)" }} />
              Cautela
            </span>
            <span className="li">
              <span className="swatch" style={{ background: "var(--red)" }} />
              Atenção
            </span>
          </div>
        )}
        <button
          type="button"
          className="toggle-btn"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? "Recolher gráfico" : "Expandir gráfico"}
        >
          {expanded ? "Recolher" : "Detalhes"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>
      <div className="chart-body">
        {expanded && (
          <div className="y-axis">
            {yTicks.map((t, i) => (
              <div key={i}>R$ {fmtK(t)}</div>
            ))}
          </div>
        )}
        <div className="plot-col">
          <div className="plot">
            <svg
              className="plot-svg"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              {zeroPos !== null && (
                <line
                  className="zero-line"
                  x1="0"
                  x2="100"
                  y1={(zeroPos * 100).toFixed(2)}
                  y2={(zeroPos * 100).toFixed(2)}
                />
              )}
              {areaPath && <path className="line-area" d={areaPath} />}
              <path className="line-path" d={linePath} />
            </svg>
            <div className="plot-dots">
            {points.map((p) => (
              <span
                key={p.h.month}
                className={
                  "dot-wrap" +
                  (p.isCurrent ? " is-current" : "")
                }
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
              >
                <span
                  className={
                    "dot farol-" +
                    farolCssClass[p.level] +
                    (p.isCurrent ? " current" : "")
                  }
                />
                {expanded && p.isCurrent && (
                  <span className="point-label">{formatBRL(p.h.saldo.toFixed(2))}</span>
                )}
              </span>
            ))}
            </div>
          </div>
          {expanded && (
            <div className="x-axis">
              {history.map((h) => {
                const isCurrent = h.month === currentMonth;
                return (
                  <div key={h.month} className={"x-cell" + (isCurrent ? " current" : "")}>
                    {shortMonth(h.month)}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
