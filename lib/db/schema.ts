import {
  pgTable,
  uuid,
  text,
  pgEnum,
  numeric,
  integer,
  date,
  boolean,
  timestamp,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const entryCategory = pgEnum("entry_category", [
  "fixed_bill",
  "variable_bill",
  "income",
]);

export const freezeTrigger = pgEnum("freeze_trigger", [
  "date_based",
  "action_based",
]);

export const recurringEntries = pgTable(
  "recurring_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    category: entryCategory("category").notNull(),
    defaultAmount: numeric("default_amount", { precision: 12, scale: 2 }),
    dueDay: integer("due_day"),
    effectiveFrom: date("effective_from", { mode: "string" }).notNull(),
    effectiveTo: date("effective_to", { mode: "string" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      "due_day_range",
      sql`${t.dueDay} IS NULL OR (${t.dueDay} BETWEEN 1 AND 31)`,
    ),
    check(
      "effective_order",
      sql`${t.effectiveTo} IS NULL OR ${t.effectiveFrom} <= ${t.effectiveTo}`,
    ),
  ],
);

export const monthlyEntries = pgTable(
  "monthly_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recurringEntryId: uuid("recurring_entry_id").references(
      () => recurringEntries.id,
      { onDelete: "set null" },
    ),
    month: date("month", { mode: "string" }).notNull(),
    nameSnapshot: text("name_snapshot").notNull(),
    categorySnapshot: entryCategory("category_snapshot").notNull(),
    dueDaySnapshot: integer("due_day_snapshot"),
    amount: numeric("amount", { precision: 12, scale: 2 }),
    paid: boolean("paid").notNull().default(false),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("uq_monthly_recurring_month").on(t.recurringEntryId, t.month),
    index("idx_monthly_month").on(t.month),
  ],
);

export const appSettings = pgTable("app_settings", {
  id: integer("id").primaryKey().default(1),
  farolGreenThresholdPct: integer("farol_green_threshold_pct")
    .notNull()
    .default(20),
  freezeTrigger: freezeTrigger("freeze_trigger")
    .notNull()
    .default("date_based"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
