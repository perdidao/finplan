import { notFound } from "next/navigation";
import {
  fetchMonthRows,
  fetchRecentSummaries,
  groupByCategory,
  isMonthClosed,
  summarizeMonth,
} from "@/lib/server/month-view-queries";
import { listAllTemplates } from "@/lib/server/recurring-queries";
import { isMonthFrozen } from "@/lib/server/freeze";
import { getSettings } from "@/lib/server/settings";
import { currentMonthInSP } from "@/lib/time/month";
import { db } from "@/lib/db/client";
import { monthlyEntries } from "@/lib/db/schema";
import { lt, gt } from "drizzle-orm";
import { HeaderBar } from "@/components/header-bar";
import { SummaryCard } from "@/components/summary-card";
import { SaldoChart } from "@/components/saldo-chart";
import { EntriesTable } from "@/components/entries-table";
import { EmptyState } from "@/components/empty-state";

const MONTH_RE = /^\d{4}-\d{2}-01$/;

export default async function MonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  if (!MONTH_RE.test(month)) notFound();

  const [
    rows,
    templates,
    settings,
    frozen,
    anyMaterialized,
    prevExists,
    nextExists,
    history,
  ] = await Promise.all([
    fetchMonthRows(month),
    listAllTemplates(),
    getSettings(),
    isMonthFrozen(month),
    db
      .select({ id: monthlyEntries.id })
      .from(monthlyEntries)
      .limit(1)
      .then((r) => r.length > 0),
    db
      .select({ id: monthlyEntries.id })
      .from(monthlyEntries)
      .where(lt(monthlyEntries.month, month))
      .limit(1)
      .then((r) => r.length > 0),
    db
      .select({ id: monthlyEntries.id })
      .from(monthlyEntries)
      .where(gt(monthlyEntries.month, month))
      .limit(1)
      .then((r) => r.length > 0),
    fetchRecentSummaries(month, 6),
  ]);

  const isFirstRun = templates.length === 0 && rows.length === 0;
  const grouped = groupByCategory(rows);
  const summary = summarizeMonth(rows);
  // Editable closure: all bills paid marks the month as "fechado" without
  // making it read-only (un-paying a bill reopens it). Frozen months remain
  // read-only via the date/action freeze trigger.
  const closed = frozen || isMonthClosed(summary);

  if (isFirstRun) {
    return (
      <div className="app">
        <HeaderBar
          month={month}
          hasPrev={false}
          hasNext={false}
          isCurrentMonth={month === currentMonthInSP()}
          isFirstRun
          isClosed={false}
        />
        <div className="page">
          <EmptyState month={month} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <HeaderBar
        month={month}
        hasPrev={prevExists}
        hasNext={nextExists}
        isCurrentMonth={month === currentMonthInSP()}
        isFirstRun={!anyMaterialized}
        isClosed={closed}
      />
      <div className="page">
        {frozen ? (
          <div className="closed-banner">
            <span>Mês fechado. Visualização apenas.</span>
          </div>
        ) : null}
        <SummaryCard
          summary={summary}
          rows={rows}
          history={history}
          thresholdPct={settings.farolGreenThresholdPct}
        />
        <SaldoChart
          history={history}
          currentMonth={month}
          thresholdPct={settings.farolGreenThresholdPct}
        />
        <div className="tables-grid">
          <EntriesTable
            category="fixed_bill"
            rows={grouped.fixed}
            month={month}
            frozen={frozen}
          />
          <EntriesTable
            category="variable_bill"
            rows={grouped.variable}
            month={month}
            frozen={frozen}
          />
          <EntriesTable
            category="income"
            rows={grouped.income}
            month={month}
            frozen={frozen}
          />
        </div>
      </div>
    </div>
  );
}
