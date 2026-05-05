# Finplan v3 — Warm-Cream Pastel Redesign

Date: 2026-05-05
Source: Claude Design handoff bundle (`finplan/project/Dashboard.html` + `styles.css` + `app-dashboard.jsx`).

## Goal

Replace the current dark-charcoal/lime aesthetic with the warm-cream pastel direction from the bundle, and add a month-by-month Saldo chart that starts compact and can be expanded to the full version.

## Scope

**In:**
- Palette flip: warm cream page bg, soft-black ink, lime kept as small accent only.
- 5 summary cards: sage Despesas, butter Receitas, lavender Saldo, cream Farol (donut ring), ink-black Pagamentos (16-cell grid).
- Delta pills on the first 3 cards showing % change vs previous month.
- Donut Farol replaces the simple disc.
- 16-cell Pagamentos grid replaces the linear progress bar.
- New month-by-month Saldo bar chart (last 6 months, farol-colored bars, current month outlined in lime).
- Compact-by-default chart (~60px bar strip, no axes) that expands inline to the full chart on toggle.
- Section swatches (sage/butter/lavender chips in section titles).
- Hairline borders, larger card radius (22px on sumcards), keep table density.

**Out:**
- Sparklines inside summary cards (the saldo chart already conveys trend; avoids duplicating the same idea twice on one screen).
- Any dialog/drawer/settings restyle in this pass — only the dashboard surfaces.
- Tweaks panel from the bundle (not part of this app).

## Architecture

### Backend
Add to `lib/server/month-view-queries.ts`:

```ts
export interface MonthHistoryEntry {
  month: string;          // YYYY-MM-01
  despesas: number;
  receitas: number;
  saldo: number;
  paidCount: number;
  totalCount: number;
}

export async function fetchRecentSummaries(
  currentMonth: string,
  count: number
): Promise<MonthHistoryEntry[]>;
```

Pulls all `monthly_entries` rows for the N most-recent months ending at `currentMonth` (inclusive), groups by `month`, and runs `summarizeMonth` per group. Months with no entries are omitted (the chart handles holes gracefully).

### Components
- `components/summary-card.tsx` — rewritten. New props: `history: MonthHistoryEntry[]` so it can compute deltas vs `history[history.length - 2]`. Renders 5 cards with the new variants. No client interactivity needed — stays a server component.
- `components/saldo-chart.tsx` — **new client component**. Props: `{ history, currentMonth, thresholdPct }`. State: `expanded` (default false). Compact: 60px bar strip, no axes/labels, current-month bar gets lime ring. Expanded: 220px chart with y-axis ticks, x-axis month labels, hover bar labels, legend. Toggle button in the header (chevron + "Detalhes" label).
- `components/farol-donut.tsx` — small server component for the donut ring. Replaces `farol-indicator.tsx` usage in the summary card. We keep `farol-indicator.tsx` intact for now (used in settings preview).

### Page wiring
`app/m/[month]/page.tsx`: add `fetchRecentSummaries(month, 6)` to the `Promise.all`, pass to `SummaryCard` and `SaldoChart`. Mount `SaldoChart` between summary and tables.

### CSS
`app/globals.css`:
- Replace the existing `:root` token block (line 133–155) with the bundle's warm-cream tokens (cream bg, ink, rule, accent kept, pastel tints, farol greens/ambers/reds).
- Remove existing `.summary` / `.sumcell` / `.pagamentos*` blocks; replace with `.summary` / `.sumcard` / `.farol-card` / `.pag-card` / `.pag-grid` blocks per the bundle.
- Add new `.saldo-chart` block (collapsed and expanded states share most styles; collapsed uses a `.is-compact` modifier that hides the y-axis, x-axis, legend, and bar labels and shrinks `.chart-body` to 60px).
- Update `.section`, `.section-head`, `.section-title .swatch`, `.tbl-row` etc. to the lighter aesthetic.
- Top bar: switch to the cream backdrop-blur look (`background: rgba(239, 233, 217, 0.85); backdrop-filter: blur(8px);`).
- Mobile breakpoints: keep existing media queries for `.tables-grid`; update `.summary` to stack to 2 cols at ≤1180px and 1 col at ≤640px.

### Tokens that change
| Token        | Old        | New        |
|--------------|------------|------------|
| `--bg`       | `#282828`  | `#efe9d9`  |
| `--bg-card`  | `#303030`  | `#ffffff`  |
| `--ink`      | `#f4f3ee`  | `#1d1d1d`  |
| `--ink-2`    | `#b9b6ad`  | `#4a4842`  |
| `--ink-3`    | `#828079`  | `#8a877d`  |
| `--rule`     | `#3a3a3a`  | `#d9d2bd`  |
| `--accent`   | `#d7fe62`  | `#d7fe62`  (unchanged) |
| `--green`    | `#93c47d`  | `#5b8c4f`  |
| `--amber`    | `#e8b04d`  | `#c98b2a`  |
| `--red`      | `#e06c5a`  | `#b14a3a`  |
| `--radius-lg` | (new)     | `22px`     |
| `--tint-sage/butter/lav` | (new) | per bundle |

## Compact ↔ Expanded Saldo Chart

**Compact (default):**
- Container: `.saldo-chart.is-compact`
- Header: title "Saldo mês a mês" + ▾ toggle button.
- Body: 60px tall, horizontal bars only. No y-axis, no legend, no x-axis labels, no hover labels. Bars keep farol coloring; current-month bar keeps the lime outline.
- Click anywhere in the header (or chevron) to expand.

**Expanded:**
- Container: `.saldo-chart` (no `.is-compact`).
- Full layout: 220px chart with y-axis ticks (5 ticks), x-axis month labels (uppercase Pt-BR short — `mai`, `abr`…), hover bar labels showing exact BRL value (current month label always shown), legend with green/amber/red swatches, dashed zero line.
- Click ▴ chevron to collapse.

State lives in the SaldoChart component (client). No URL/persistence — collapsed by default each visit.

## Risks / Notes

- **Color contrast on tinted cards:** soft-black ink on sage/butter/lavender meets WCAG AA for normal text by inspection of the bundle's swatches. Verify in browser.
- **6-month history performance:** simple aggregation over `monthly_entries` filtered by `month` IN (last 6 yyyy-mm-01 strings). Single query, indexed column.
- **Old farol disc still used in settings preview** (`components/settings/farol-threshold-form.tsx` uses `FarolDisc`). Leaving that file alone preserves settings appearance.
- **Tests:** existing snapshot/integration tests touch `SummaryCard` props shape (`summary`, `rows`, `thresholdPct`). Adding `history` is additive (optional or required-with-empty-fallback). I'll default to required + tests pass empty `history: []`.

## File deltas

| File | Change |
|------|--------|
| `lib/server/month-view-queries.ts` | + `fetchRecentSummaries`, + `MonthHistoryEntry` type |
| `app/m/[month]/page.tsx` | + history fetch, + `SaldoChart` mount, + history prop on `SummaryCard` |
| `components/summary-card.tsx` | rewrite to new card layout |
| `components/saldo-chart.tsx` | **new** |
| `app/globals.css` | palette + summary/farol/pag/saldo/section blocks |
