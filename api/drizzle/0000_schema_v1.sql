CREATE SCHEMA "surreal";
--> statement-breakpoint
CREATE TYPE "surreal"."account_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TYPE "surreal"."device_status" AS ENUM('active', 'blocked');--> statement-breakpoint
CREATE TYPE "surreal"."donation_status" AS ENUM('pending', 'confirming', 'paid', 'underpaid', 'failed');--> statement-breakpoint
CREATE TYPE "surreal"."feedback_kind" AS ENUM('session', 'bug', 'suggestion');--> statement-breakpoint
CREATE TYPE "surreal"."key_source" AS ENUM('new_account', 'donation', 'admin_grant');--> statement-breakpoint
CREATE TYPE "surreal"."key_status" AS ENUM('issued', 'active', 'exhausted', 'expired', 'revoked');--> statement-breakpoint
CREATE TYPE "surreal"."rule_type" AS ENUM('new_account', 'tier');--> statement-breakpoint
CREATE TYPE "surreal"."staff_role" AS ENUM('support', 'admin', 'owner');--> statement-breakpoint
CREATE TYPE "surreal"."transfer_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "surreal"."voice_status" AS ENUM('processing', 'pending_verification', 'active', 'rejected', 'removed');--> statement-breakpoint
CREATE TABLE "surreal"."accounts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"phone" text,
	"status" "surreal"."account_status" DEFAULT 'active' NOT NULL,
	"status_reason" text,
	"staff_role" "surreal"."staff_role",
	"linked_device_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_email_unique" UNIQUE("email"),
	CONSTRAINT "accounts_phone_unique" UNIQUE("phone"),
	CONSTRAINT "accounts_linked_device_id_unique" UNIQUE("linked_device_id"),
	CONSTRAINT "accounts_email_or_phone" CHECK ("email" is not null or "phone" is not null)
);
--> statement-breakpoint
CREATE TABLE "surreal"."activation_attempts" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "surreal"."activation_attempts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"device_hash" text NOT NULL,
	"device_code" text NOT NULL,
	"key_id" uuid,
	"account_id" uuid,
	"result" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surreal"."audit_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "surreal"."audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"actor_id" uuid,
	"actor_label" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surreal"."device_transfer_notes" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "surreal"."device_transfer_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"transfer_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"note" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surreal"."device_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"old_device_id" uuid,
	"new_device_code" text NOT NULL,
	"new_device_hash" text,
	"proof_files" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proof_purged_at" timestamp with time zone,
	"explanation" text NOT NULL,
	"status" "surreal"."transfer_status" DEFAULT 'pending' NOT NULL,
	"decided_by" uuid,
	"reason" text,
	"rebound_key_id" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "surreal"."devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"device_hash" text NOT NULL,
	"device_code" text NOT NULL,
	"account_id" uuid NOT NULL,
	"status" "surreal"."device_status" DEFAULT 'active' NOT NULL,
	"blocked_reason" text,
	"blocked_at" timestamp with time zone,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "devices_device_hash_unique" UNIQUE("device_hash")
);
--> statement-breakpoint
CREATE TABLE "surreal"."donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"amount_usd" numeric(10, 2) NOT NULL,
	"rule_id" uuid,
	"tier_snapshot" jsonb NOT NULL,
	"np_invoice_id" text,
	"np_payment_id" text,
	"np_status" text,
	"status" "surreal"."donation_status" DEFAULT 'pending' NOT NULL,
	"key_id" uuid,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donations_np_invoice_id_unique" UNIQUE("np_invoice_id"),
	CONSTRAINT "donations_key_id_unique" UNIQUE("key_id"),
	CONSTRAINT "donations_amount_positive" CHECK ("amount_usd" > 0)
);
--> statement-breakpoint
CREATE TABLE "surreal"."feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "surreal"."feedback_kind" NOT NULL,
	"session_id" uuid,
	"account_id" uuid,
	"rating" smallint,
	"worked" text,
	"didnt_work" text,
	"comment" text,
	"app_version" text,
	"gpu_model" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feedback_rating_range" CHECK ("rating" is null or "rating" between 1 and 5),
	CONSTRAINT "feedback_session_rated" CHECK ("kind" <> 'session' or ("session_id" is not null and "rating" is not null))
);
--> statement-breakpoint
CREATE TABLE "surreal"."key_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "surreal"."rule_type" NOT NULL,
	"name" text NOT NULL,
	"min_usd" numeric(10, 2),
	"max_usd" numeric(10, 2),
	"go_lives" integer NOT NULL,
	"minutes_per_go_live" integer NOT NULL,
	"expiry_days" integer NOT NULL,
	"features" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "key_rules_positive_limits" CHECK ("go_lives" > 0 and "minutes_per_go_live" > 0 and "expiry_days" > 0),
	CONSTRAINT "key_rules_amounts" CHECK (("type" = 'new_account' and "min_usd" is null and "max_usd" is null)
        or ("type" = 'tier' and "min_usd" > 0 and ("max_usd" is null or "max_usd" >= "min_usd")))
);
--> statement-breakpoint
CREATE TABLE "surreal"."keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" text NOT NULL,
	"key_last4" text NOT NULL,
	"key_ciphertext" text,
	"revealed_at" timestamp with time zone,
	"account_id" uuid NOT NULL,
	"device_id" uuid,
	"source" "surreal"."key_source" NOT NULL,
	"rule_id" uuid,
	"rule_snapshot" jsonb NOT NULL,
	"go_lives_total" integer NOT NULL,
	"go_lives_used" integer DEFAULT 0 NOT NULL,
	"minutes_per_go_live" integer NOT NULL,
	"features" jsonb NOT NULL,
	"status" "surreal"."key_status" DEFAULT 'issued' NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_reason" text,
	CONSTRAINT "keys_key_hash_unique" UNIQUE("key_hash"),
	CONSTRAINT "keys_go_lives" CHECK ("go_lives_total" > 0 and "go_lives_used" >= 0 and "go_lives_used" <= "go_lives_total"),
	CONSTRAINT "keys_minutes" CHECK ("minutes_per_go_live" > 0)
);
--> statement-breakpoint
CREATE TABLE "surreal"."np_ipn_events" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "surreal"."np_ipn_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"donation_id" uuid,
	"np_payment_id" text NOT NULL,
	"np_status" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "surreal"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_id" uuid NOT NULL,
	"device_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"counted_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"end_reason" text,
	"voice_enabled" boolean DEFAULT false NOT NULL,
	"voice_id" uuid,
	"voice_pod" text,
	"voice_seconds" integer DEFAULT 0 NOT NULL,
	"avg_fps" real,
	"avg_voice_delay_ms" integer,
	"app_version" text,
	"gpu_model" text
);
--> statement-breakpoint
CREATE TABLE "surreal"."voices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_account_id" uuid,
	"name" text NOT NULL,
	"reference_file" text NOT NULL,
	"preview_file" text,
	"verified_at" timestamp with time zone,
	"status" "surreal"."voice_status" DEFAULT 'processing' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "surreal"."accounts" ADD CONSTRAINT "accounts_linked_device_id_devices_id_fk" FOREIGN KEY ("linked_device_id") REFERENCES "surreal"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."activation_attempts" ADD CONSTRAINT "activation_attempts_key_id_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "surreal"."keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."activation_attempts" ADD CONSTRAINT "activation_attempts_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "surreal"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."device_transfer_notes" ADD CONSTRAINT "device_transfer_notes_transfer_id_device_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "surreal"."device_transfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."device_transfer_notes" ADD CONSTRAINT "device_transfer_notes_author_id_accounts_id_fk" FOREIGN KEY ("author_id") REFERENCES "surreal"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."device_transfers" ADD CONSTRAINT "device_transfers_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "surreal"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."device_transfers" ADD CONSTRAINT "device_transfers_old_device_id_devices_id_fk" FOREIGN KEY ("old_device_id") REFERENCES "surreal"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."device_transfers" ADD CONSTRAINT "device_transfers_decided_by_accounts_id_fk" FOREIGN KEY ("decided_by") REFERENCES "surreal"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."device_transfers" ADD CONSTRAINT "device_transfers_rebound_key_id_keys_id_fk" FOREIGN KEY ("rebound_key_id") REFERENCES "surreal"."keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."devices" ADD CONSTRAINT "devices_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "surreal"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."donations" ADD CONSTRAINT "donations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "surreal"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."donations" ADD CONSTRAINT "donations_rule_id_key_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "surreal"."key_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."donations" ADD CONSTRAINT "donations_key_id_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "surreal"."keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."feedback" ADD CONSTRAINT "feedback_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "surreal"."sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."feedback" ADD CONSTRAINT "feedback_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "surreal"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."key_rules" ADD CONSTRAINT "key_rules_updated_by_accounts_id_fk" FOREIGN KEY ("updated_by") REFERENCES "surreal"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."keys" ADD CONSTRAINT "keys_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "surreal"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."keys" ADD CONSTRAINT "keys_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "surreal"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."keys" ADD CONSTRAINT "keys_rule_id_key_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "surreal"."key_rules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."np_ipn_events" ADD CONSTRAINT "np_ipn_events_donation_id_donations_id_fk" FOREIGN KEY ("donation_id") REFERENCES "surreal"."donations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."sessions" ADD CONSTRAINT "sessions_key_id_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "surreal"."keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."sessions" ADD CONSTRAINT "sessions_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "surreal"."devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."sessions" ADD CONSTRAINT "sessions_voice_id_voices_id_fk" FOREIGN KEY ("voice_id") REFERENCES "surreal"."voices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surreal"."voices" ADD CONSTRAINT "voices_owner_account_id_accounts_id_fk" FOREIGN KEY ("owner_account_id") REFERENCES "surreal"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activation_attempts_device_hash_at_idx" ON "surreal"."activation_attempts" USING btree ("device_hash","at");--> statement-breakpoint
CREATE INDEX "activation_attempts_device_code_idx" ON "surreal"."activation_attempts" USING btree ("device_code");--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "surreal"."audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_log_at_idx" ON "surreal"."audit_log" USING btree ("at");--> statement-breakpoint
CREATE INDEX "device_transfer_notes_transfer_id_idx" ON "surreal"."device_transfer_notes" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "device_transfers_account_id_idx" ON "surreal"."device_transfers" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "device_transfers_status_idx" ON "surreal"."device_transfers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "devices_device_code_idx" ON "surreal"."devices" USING btree ("device_code");--> statement-breakpoint
CREATE INDEX "devices_account_id_idx" ON "surreal"."devices" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "donations_account_id_idx" ON "surreal"."donations" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "donations_np_payment_id_idx" ON "surreal"."donations" USING btree ("np_payment_id");--> statement-breakpoint
CREATE INDEX "feedback_created_at_idx" ON "surreal"."feedback" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "key_rules_one_new_account_rule" ON "surreal"."key_rules" USING btree ("type") WHERE "type" = 'new_account';--> statement-breakpoint
CREATE UNIQUE INDEX "keys_one_current_per_account" ON "surreal"."keys" USING btree ("account_id") WHERE "status" in ('issued', 'active');--> statement-breakpoint
CREATE UNIQUE INDEX "keys_one_free_key_per_account" ON "surreal"."keys" USING btree ("account_id") WHERE "source" = 'new_account';--> statement-breakpoint
CREATE INDEX "keys_device_id_idx" ON "surreal"."keys" USING btree ("device_id");--> statement-breakpoint
CREATE UNIQUE INDEX "np_ipn_events_payment_status" ON "surreal"."np_ipn_events" USING btree ("np_payment_id","np_status");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_one_open_per_key" ON "surreal"."sessions" USING btree ("key_id") WHERE "ended_at" is null;--> statement-breakpoint
CREATE INDEX "sessions_device_started_idx" ON "surreal"."sessions" USING btree ("device_id","started_at");--> statement-breakpoint
CREATE INDEX "sessions_started_at_idx" ON "surreal"."sessions" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "voices_owner_account_id_idx" ON "surreal"."voices" USING btree ("owner_account_id");