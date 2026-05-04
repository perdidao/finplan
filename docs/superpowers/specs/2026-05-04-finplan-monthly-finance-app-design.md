# Finplan — Personal Monthly Finance App (v1 design)

**Status:** Design accepted, ready for implementation plan.
**Date:** 2026-05-04
**Author:** Lucas Almeida (with Claude)

## 1. Purpose & scope

A single-user personal finance webapp that replaces a spreadsheet currently used to track:

- **Despesas fixas** — recurring monthly bills with a due day; amount may be fixed (e.g. Sanepar ≈ R$ 115) or vary month-to-month (e.g. Vivo).
- **Despesas variáveis** — credit-card invoices that recur every month with no due day in the entry; amount is filled in over the month and frozen on payment.
- **Entradas** — recurring monthly incomes (salaries).
- **Monthly summary** — Despesas, Receitas, Saldo, plus two indicators (Farol = saldo health, Pagamentos = bills-paid progress).

**Explicitly out of scope for v1:**

- Multi-user / shared households / per-user permissions.
- Categorization beyond `fixed_bill | variable_bill | income`.
- Budgets, charts, multi-month reports, forecasts beyond next month.
- Importing or parsing credit-card statements line-by-line.
- One-off / non-recurring transactions in the UI (the schema allows them, the UI does not).
- Email / push reminders.

## 2. Architectural overview

- **Next.js 15** (App Router), deployed on **Vercel**.
- Server Components for reads; **Server Actions** for writes. No separate API layer.
- **Neon Postgres** via Vercel's Neon integration (free tier).
- **Drizzle ORM** for schema + queries (no codegen step → friendlier to serverless cold starts).
- **Tailwind CSS + shadcn/ui** for the table-heavy UI.
- **Edge middleware** enforces a password cookie on every route except `/login` and static assets.
- **No background jobs, no cron, no queues.** Forward-month materialization is triggered manually by a "Generate next month" button.
- **Localization:** `pt-BR` throughout. Currency via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Dates formatted `dd/MM/yyyy`. All "what month is it" / "what day is it" computations resolve in `America/Sao_Paulo` via `date-fns-tz`, never via raw `new Date()`.

## 3. Data model

Two primary tables plus one settings table.

### 3.1 `recurring_entries` (templates)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `name` | `text` | "Sanepar", "Nubank Lucas", "Salário Lucas" |
| `category` | `enum('fixed_bill','variable_bill','income')` | |
| `default_amount` | `numeric(12,2)` null | Null for `variable_bill` |
| `due_day` | `int` null (1..31) | Null for `variable_bill` and `income` |
| `effective_from` | `date` not null | Always the 1st of a month |
| `effective_to` | `date` null | Null = still active; otherwise last day inclusive |
| `sort_order` | `int` not null | UI ordering within section |
| `created_at` | `timestamptz` default `now()` | |

A constraint enforces `effective_from <= effective_to` when `effective_to` is not null.

### 3.2 `monthly_entries` (materialized rows)

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | |
| `recurring_entry_id` | `uuid` FK → `recurring_entries(id)`, nullable | Nullable so future one-off entries are possible without schema change |
| `month` | `date` not null | Always day=01 of that month |
| `name_snapshot` | `text` not null | Frozen at generation; survives template renames |
| `category_snapshot` | `enum` not null | Frozen at generation |
| `due_day_snapshot` | `int` null | Frozen at generation |
| `amount` | `numeric(12,2)` null | Null = "not yet filled in" (variable bills/cards before user enters value); distinguishes from R$ 0,00 |
| `paid` | `boolean` not null default `false` | |
| `paid_at` | `timestamptz` null | Set when `paid` flips to true |
| `notes` | `text` null | |
| `created_at` | `timestamptz` default `now()` | |
| `updated_at` | `timestamptz` default `now()` | Bumped on every update |

Constraints: `unique (recurring_entry_id, month)` — drives idempotent generation. Index on `(month)` for the month view query.

### 3.3 `app_settings`

Single-row table (enforced by app, not DB):

| Column | Type | Default |
|---|---|---|
| `farol_green_threshold_pct` | `int` | `20` |
| `freeze_trigger` | `enum('date_based','action_based')` | `date_based` |
| `updated_at` | `timestamptz` | `now()` |

`freeze_trigger = date_based` (default): a month is read-only when the current calendar month (in `America/Sao_Paulo`) is later than that month.
`freeze_trigger = action_based`: a month is read-only once the next month has been generated. Stored to allow easy switching later; v1 ships with `date_based`.

### 3.4 Why snapshots on `monthly_entries`

If you rename "Vivo" to "Claro" in 2027, March-2026's row still says "Vivo" — historical truth preserved. Same applies to `due_day_snapshot` and `category_snapshot`.

### 3.5 Why effective dates on the template

"Edit from now on" is implemented as: close the existing template (`effective_to = last day of previous month`) and insert a new template version (`effective_from = first day of current month`). Generating a future month picks the template active for that month. This yields a clean audit trail of what changed when, without an explicit history table.

## 4. Generation & edit semantics

### 4.1 Generate next month (button)

A Server Action that runs in a single transaction:

1. Compute `target_month` = first day of (current month in São Paulo) + 1 month.
2. If `monthly_entries` already has any rows where `month = target_month`, the button is disabled — no-op safety.
3. `SELECT * FROM recurring_entries WHERE effective_from <= target_month AND (effective_to IS NULL OR effective_to >= target_month)`.
4. For each, `INSERT INTO monthly_entries (recurring_entry_id, month, name_snapshot, category_snapshot, due_day_snapshot, amount) VALUES (..., default_amount)` with `ON CONFLICT (recurring_entry_id, month) DO NOTHING` (idempotent on accidental double-fire).

**First-run special case:** if no `monthly_entries` rows exist *at all*, the button (labeled "Gerar mês atual") generates the **current** month instead of next month. After that first invocation, the button reverts to "Gerar próximo mês".

**No-templates case:** if step 3 returns zero rows, the action returns an error toast: "Adicione uma despesa fixa, variável ou entrada antes de gerar o mês."

### 4.2 Editing a row from the month view

Each row in the month view has an action menu (⋮) → Edit. Editing produces a confirmation dialog with two save buttons (no implicit default):

**"Salvar apenas em \<mês\>"** → simple `UPDATE monthly_entries SET ... WHERE id = ?`. Template untouched.

**"Salvar daqui em diante"** → in a transaction:
1. `UPDATE recurring_entries SET effective_to = (first day of current month - 1 day) WHERE id = old_template_id` to close the old version.
2. `INSERT INTO recurring_entries (...) VALUES (...)` with `effective_from = first day of current month` and the new field values.
3. `UPDATE monthly_entries SET name_snapshot = ?, due_day_snapshot = ?, category_snapshot = ?, amount = ?, recurring_entry_id = <new_template_id> WHERE recurring_entry_id = <old_template_id> AND month >= <current_month>` — covers the current row and any already-generated future row.

Inline editing is allowed for `amount` only on the current month (the most common change, e.g. filling in a credit-card invoice). It always behaves as "just this month" — never alters the template.

The `paid` checkbox is similarly always "just this month".

### 4.3 Deleting a recurring entry

Two paths via the same dialog:
- **Apenas \<mês\>**: delete the `monthly_entries` row only.
- **Daqui em diante**: set `effective_to = first day of current month - 1 day` on the template; delete the current row + any already-generated future rows for that template.

### 4.4 Adding a new recurring entry

Form fields: name, category, default amount (optional for `variable_bill`), due day (only when `category = fixed_bill`), `effective_from` (defaults to first day of current month), sort order (auto-assigned to end of category).

On save, in a transaction: inserts the template, then for every distinct `month` already present in `monthly_entries` where `month >= effective_from`, also inserts a corresponding `monthly_entries` row (snapshots taken from the new template, `amount = default_amount`, `paid = false`).

### 4.5 Past months

A "frozen" month is read-only: inline edits, action menus, and `paid` checkboxes are disabled, and Server Actions reject any write whose target row has `month` in a frozen month. A banner at the top of the table reads: *"Mês fechado. Visualização apenas."*

The freeze rule depends on `app_settings.freeze_trigger`:

- **`date_based`** (v1 default): a month is frozen iff its first day is before the first day of the current calendar month in `America/Sao_Paulo`.
- **`action_based`**: a month is frozen iff a strictly later month already has any row in `monthly_entries` (i.e., generating the next month freezes the current one).

Edits flagged "from now on" are still rejected when the *editing* month is frozen — you can never reach into a frozen month to start a new template version, even though the version itself would apply forward.

## 5. Month view UI

### 5.1 Header bar

- Left: month picker `◀ Maio 2026 ▶`. Forward arrow disabled when the next month doesn't exist.
- Adjacent (when forward is disabled): button **"Gerar próximo mês"** (or "Gerar mês atual" on first run).
- Right: link to **Configurações**, **Sair** (clears cookie).

### 5.2 Summary card

Full-width row, mirrors the spreadsheet's right-hand column:

| Despesas | Receitas | Saldo | Farol | Pagamentos |
|---|---|---|---|---|
| `R$ 25.714,68` | `R$ 25.000,00` | `-R$ 714,68` | 🔴 | `12 / 19` |

- **Farol** = green if `Saldo / Receitas ≥ 20%`, yellow if `0 ≤ Saldo / Receitas < 20%`, red if `Saldo < 0`. When `Receitas = 0`, Farol is red unless `Saldo >= 0` and `Despesas = 0` (green) — the boundary case rendered explicitly to avoid a divide-by-zero.
- **Pagamentos** = `paid bills + cards / total bills + cards`. Income rows do not count.

### 5.3 Tables

Three stacked `<Table>` blocks in spreadsheet order: **Despesas fixas**, **Despesas variáveis**, **Entradas**. Columns:

| Nome | Valor | Venc. | ok | (⋮) |
|---|---|---|---|---|
| clickable → drawer | inline-editable on current month | read-only, blank for cards/income | checkbox | menu: Editar / Excluir |

Each table has a sticky bottom subtotal row matching the spreadsheet (Total R$ ...). Empty values for variable bills/cards render as a placeholder (`—`).

### 5.4 Add buttons

`+ Despesa fixa` / `+ Despesa variável` / `+ Entrada` buttons sit at the bottom of each section. Same form, category pre-selected.

### 5.5 Settings page

- Farol threshold (numeric input, default 20, clamped 0–100).
- Freeze trigger toggle (`date_based` / `action_based`) — present in v1 for completeness, default unchanged.
- Change password (instruction text only: "Defina `APP_PASSWORD` no Vercel e refaça o deploy").
- "Gerenciar entradas recorrentes" — list of all templates including ended ones (strikethrough) for sanity checks.

### 5.6 Empty state

First run, before any template exists: a centered card with "Bem-vindo. Adicione sua primeira despesa fixa, variável ou entrada para começar." and three buttons.

## 6. Auth

- Two env vars on Vercel: `APP_PASSWORD` (the secret) and `AUTH_SECRET` (32 random bytes, base64). The app refuses to boot if either is missing.
- `app/login/page.tsx`: single password input. Server Action compares input to `APP_PASSWORD` via `crypto.timingSafeEqual` (constant-time).
- On match, set HTTP-only signed cookie `finplan_auth=<hmac>`, where the value is HMAC-SHA256 of a constant string with `AUTH_SECRET`. Cookie attributes: `Secure`, `SameSite=Lax`, `Path=/`, `Max-Age=2592000` (30 days), `HttpOnly`.
- `middleware.ts` (matcher excludes `/login`, `/_next/*`, `/favicon.ico`, `/api/health` if added) verifies HMAC; redirects to `/login?next=<path>` on miss.
- Logout = `Set-Cookie` with `Max-Age=0`.
- **No rate limiting in v1.** If brute-force attempts appear in logs, add `@upstash/ratelimit` then.

## 7. Edge cases & error handling

- **Generate clicked twice fast:** `INSERT ... ON CONFLICT DO NOTHING` makes it idempotent.
- **Template ended mid-month:** if `effective_to` falls inside a month already generated, the existing row stays (snapshot truth). Future generations correctly skip the template.
- **Generate when no templates exist:** Server Action returns the "no templates" error toast.
- **Decimal / money:** all amounts are `numeric(12,2)` in PG, transmitted as strings, parsed via a tiny `parseBRL` / `formatBRL` pair. No JavaScript floats touch monetary values.
- **Timezone:** "current month" / "current day" computed via `date-fns-tz` pinned to `America/Sao_Paulo`. Server Actions accept `month` strictly as `'YYYY-MM-01'` and validate it.
- **Concurrent edits:** single user, single session — last-write-wins is fine. No optimistic locking.
- **Database failure:** per-route `error.tsx` boundary with a friendly message and retry button. Errors logged to Vercel.

## 8. Testing

Light, scoped to the parts that are easy to get wrong.

**Unit (vitest):**
- "Active template for a given month" query — boundary cases on `effective_from`/`effective_to`.
- "Edit from now on" transaction — closes old, opens new, updates only correct rows; rejects when `target_month` is in the past.
- Farol classification — boundaries at 0%, 20%, negative, and `Receitas = 0`.
- BRL parse / format round-trip.
- Timezone helpers — "what month is it" near midnight São Paulo time.

**Integration (vitest + a throwaway Neon branch DB):**
- One end-to-end flow: create three templates → generate next month → assert correct snapshots and amounts → edit "from now on" → assert template versioning + row updates.

**No Playwright / E2E in v1.** Manual smoke through a Vercel preview before merging is the UI test. If a regression bites, add a focused test for that specific path.

## 9. Open considerations (deferred, not blocking v1)

- One-off (non-recurring) entries through the UI — schema already permits them (`recurring_entry_id` nullable).
- Multi-month forecasting beyond next month — would require lazy template-projection alongside materialized rows.
- Export to CSV / spreadsheet for backup.
- Reminder emails on upcoming due dates (would reintroduce a cron or scheduled function).
- Soft delete instead of hard delete for `recurring_entries` (current design hard-deletes templates with no `monthly_entries` and otherwise relies on `effective_to`).

## 10. Glossary

- **Despesas fixas / variáveis / Entradas** — the three categories visible in the UI; correspond to `fixed_bill`, `variable_bill`, `income`.
- **Farol** — Portuguese for "traffic light"; the saldo-health indicator.
- **Recurring entry / template** — a row in `recurring_entries`; defines the recurring pattern.
- **Monthly entry / instance** — a row in `monthly_entries`; the materialized appearance of a template in a specific month.
- **Generate** — the act of inserting `monthly_entries` rows for a target month from active templates.
- **"Just this month" / "From now on"** — the two confirmation choices when editing or deleting an entry.
