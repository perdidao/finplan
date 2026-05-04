CREATE TYPE "public"."entry_category" AS ENUM('fixed_bill', 'variable_bill', 'income');--> statement-breakpoint
CREATE TYPE "public"."freeze_trigger" AS ENUM('date_based', 'action_based');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"farol_green_threshold_pct" integer DEFAULT 20 NOT NULL,
	"freeze_trigger" "freeze_trigger" DEFAULT 'date_based' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recurring_entry_id" uuid,
	"month" date NOT NULL,
	"name_snapshot" text NOT NULL,
	"category_snapshot" "entry_category" NOT NULL,
	"due_day_snapshot" integer,
	"amount" numeric(12, 2),
	"paid" boolean DEFAULT false NOT NULL,
	"paid_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"category" "entry_category" NOT NULL,
	"default_amount" numeric(12, 2),
	"due_day" integer,
	"effective_from" date NOT NULL,
	"effective_to" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "due_day_range" CHECK ("recurring_entries"."due_day" IS NULL OR ("recurring_entries"."due_day" BETWEEN 1 AND 31)),
	CONSTRAINT "effective_order" CHECK ("recurring_entries"."effective_to" IS NULL OR "recurring_entries"."effective_from" <= "recurring_entries"."effective_to")
);
--> statement-breakpoint
ALTER TABLE "monthly_entries" ADD CONSTRAINT "monthly_entries_recurring_entry_id_recurring_entries_id_fk" FOREIGN KEY ("recurring_entry_id") REFERENCES "public"."recurring_entries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_monthly_recurring_month" ON "monthly_entries" USING btree ("recurring_entry_id","month");--> statement-breakpoint
CREATE INDEX "idx_monthly_month" ON "monthly_entries" USING btree ("month");