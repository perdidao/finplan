"use client";

import Link from "next/link";
import { useTransition, useRef, useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { generateMonthAction } from "@/lib/server/generate-month";
import { logoutAction } from "@/lib/auth/actions";
import { addMonths, currentMonthInSP } from "@/lib/time/month";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
  month: string;
  hasPrev: boolean;
  hasNext: boolean;
  isCurrentMonth: boolean;
  isFirstRun: boolean;
  isClosed: boolean;
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

export function HeaderBar({
  month,
  hasPrev,
  hasNext,
  isCurrentMonth,
  isFirstRun,
  isClosed,
}: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const [year, m] = month.split("-").map(Number);
  const label = `${MONTHS_PT[m - 1]} ${year}`;
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const today = currentMonthInSP();
  const showGenerate = isCurrentMonth && !hasNext;
  const showToday = month !== today && !showGenerate;

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="brand">
          <div className="brand-mark">F</div>
          <span>Finplan</span>
          <span className="brand-meta">— planejamento mensal</span>
        </div>
        <div className="month-picker">
          {hasPrev ? (
            <Link
              href={`/m/${prev}`}
              className="nav-btn"
              aria-label="Mês anterior"
            >
              <ChevronLeft />
            </Link>
          ) : (
            <button className="nav-btn" disabled aria-label="Mês anterior">
              <ChevronLeft />
            </button>
          )}
          <div className="month-label">
            {label}
            {isClosed ? <span className="closed-mark">· fechado</span> : null}
          </div>
          {hasNext ? (
            <Link
              href={`/m/${next}`}
              className="nav-btn"
              aria-label="Próximo mês"
            >
              <ChevronRight />
            </Link>
          ) : (
            <button className="nav-btn" disabled aria-label="Próximo mês">
              <ChevronRight />
            </button>
          )}
        </div>
        {showGenerate ? (
          <button
            type="button"
            className="top-action primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await generateMonthAction();
                if (!r.ok) {
                  if (r.error === "no_templates") {
                    toast.error(
                      "Adicione uma despesa fixa, variável ou entrada antes de gerar o mês.",
                    );
                  } else {
                    toast.error("Mês já foi gerado.");
                  }
                  return;
                }
                toast.success(`Mês gerado: ${formatLabel(r.month)}`);
                router.refresh();
              })
            }
          >
            <Plus />
            {isFirstRun ? "Gerar mês atual" : "Gerar próximo mês"}
          </button>
        ) : null}
        {showToday ? (
          <Link href={`/m/${today}`} className="top-action ghost">
            Hoje
          </Link>
        ) : null}
      </div>
      <div className="topbar-right">
        <div className="user-menu-wrap" ref={wrapRef}>
          <button
            type="button"
            className="top-action ghost"
            onClick={() => setMenuOpen((v) => !v)}
          >
            Conta
          </button>
          {menuOpen ? (
            <div className="user-menu">
              <Link href="/settings" onClick={() => setMenuOpen(false)}>
                <button type="button">Configurações</button>
              </Link>
              <hr />
              <form action={logoutAction}>
                <button type="submit">Sair</button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function formatLabel(month: string): string {
  const [year, m] = month.split("-").map(Number);
  return `${MONTHS_PT[m - 1]} ${year}`;
}
