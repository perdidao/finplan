# Finplan

Personal monthly finance webapp. Single-user, password-gated, deployed on Vercel. Replaces a spreadsheet for tracking recurring fixed bills, variable credit-card invoices, recurring incomes, and a monthly Saldo / Farol summary.

## Local dev

Prereqs: Node 20+, pnpm 9+, and a Neon Postgres database (free tier is enough — you'll typically have a "production" branch and a "development" branch).

```bash
pnpm install
cp .env.example .env.local
# Fill DATABASE_URL, APP_PASSWORD, AUTH_SECRET in .env.local
pnpm db:migrate
pnpm dev
```

Then open <http://localhost:3000> and log in with the password you set in `APP_PASSWORD`.

### Required env vars

| Var | What it is |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (use the development branch locally) |
| `APP_PASSWORD` | The single password the app accepts at `/login` |
| `AUTH_SECRET` | 32 random bytes, base64. Generate with `openssl rand -base64 32` |
| `TEST_DATABASE_URL` | (Optional) Neon branch URL for the integration test in T15 |

## Tests

```bash
pnpm test                                   # unit tests only (~35 tests)
TEST_DATABASE_URL=postgres://... pnpm test  # also runs the end-to-end integration test
```

The integration test wipes the database it points at, so use a dedicated Neon branch for it — never the production branch.

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the repo at <https://vercel.com/new>.
3. Add the **Neon Postgres** integration to your Vercel project — it sets `DATABASE_URL` automatically using the production branch.
4. Add the remaining env vars in Vercel's Project Settings → Environment Variables:
   - `APP_PASSWORD` (your password)
   - `AUTH_SECRET` (run `openssl rand -base64 32` and paste the output)
5. Deploy.
6. After the first deploy, run the migration once against the production database:

   ```bash
   vercel env pull .env.production.local
   DATABASE_URL=$(grep DATABASE_URL .env.production.local | cut -d= -f2-) pnpm db:migrate
   ```

   For subsequent deploys with new migrations, re-run that command before deploying — or wire it into a deploy script.

To change the password: update `APP_PASSWORD` in Vercel's env vars and redeploy. There is no in-app password change.

## Architecture

See `docs/superpowers/specs/2026-05-04-finplan-monthly-finance-app-design.md` for the full design rationale.

Stack:

- **Next.js 16** (App Router, Turbopack) on Vercel
- **React 19** with Server Components + Server Actions for all writes
- **Drizzle ORM** on **Neon Postgres** (HTTP driver — no connection pool to manage)
- **Tailwind v4** + **shadcn/ui** (Base UI primitives) for the login form; bespoke design CSS for the dashboard
- **Inter** + **JetBrains Mono** via `next/font/google`
- **Vitest** for unit + integration tests
- Locale `pt-BR`, timezone `America/Sao_Paulo` everywhere via `date-fns-tz`

## How the data model works

Two tables do the work:

- `recurring_entries` — your "templates" (Aluguel, Sanepar, Salário, …) with `effective_from` / `effective_to` dates so versioning is just inserting a new row and closing the old one.
- `monthly_entries` — the materialized rows for a generated month. They snapshot `name`, `category`, and `due_day` so historical months stay accurate even when you rename or change a template.

`app_settings` is a single-row table holding the Farol threshold (default 20%) and the freeze trigger (`date_based` by default — past months become read-only when the calendar moves past them).

## Generating future months

The app does not generate months automatically. Each month, click **"Gerar próximo mês"** in the header to materialize the next month's bills from your active templates. On first run, the same button is labeled **"Gerar mês atual"** and produces the current month.

Edit a row inline by clicking the value, or use the row action menu (`⋮`) for full edits. Recurring rows offer a scope picker:

- **Apenas este mês** — only the current row is updated; the template stays.
- **A partir de agora** — closes the existing template (effective_to = last day of previous month), opens a new template version, and applies the change to this month plus any already-generated future months.

## Project layout

```
app/                    # Next.js App Router pages
  login/page.tsx        # password gate
  m/[month]/page.tsx    # dashboard (one per month)
  settings/page.tsx     # Farol threshold + templates list
  page.tsx              # redirects to /m/<current-month-in-SP>
  layout.tsx            # html lang="pt-BR", fonts, Toaster
  globals.css           # Tailwind + design CSS

components/             # UI components (dashboard uses bespoke classes)
components/ui/          # shadcn/ui primitives (used by login)
components/settings/    # settings-page-specific components

lib/
  db/                   # Drizzle schema + client + migrations
  time/                 # São Paulo timezone helpers
  money/                # BRL parse/format
  farol/                # green/yellow/red classification
  auth/                 # password env + HMAC cookie + login/logout actions
  server/               # Server Actions and queries

proxy.ts                # auth gate (Next.js 16's middleware)
scripts/migrate.ts      # runs Drizzle migrations against DATABASE_URL
docs/superpowers/       # spec + plan
tests/                  # vitest unit + integration tests
```
