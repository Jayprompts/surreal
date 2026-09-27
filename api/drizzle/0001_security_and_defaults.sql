-- Security, integrity rules Drizzle can't express, and the default key rules.

-- ── Donation tiers may not overlap ────────────────────────────────
-- Only active tiers are checked. '[]' = both ends inclusive ($5.00–$9.99, then $10.00–…); a null max = no upper limit.
ALTER TABLE "surreal"."key_rules" ADD CONSTRAINT "key_rules_tier_ranges_no_overlap"
  EXCLUDE USING gist (numrange("min_usd", "max_usd", '[]') WITH &&) WHERE ("type" = 'tier' AND "active");
--> statement-breakpoint

-- ── Append-only tables ────────────────────────────────────────────
-- Refuses UPDATE, DELETE and TRUNCATE for everyone, including the admin login.
CREATE FUNCTION "surreal"."reject_change"() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only: % is not allowed', TG_TABLE_NAME, TG_OP;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "audit_log_append_only" BEFORE UPDATE OR DELETE ON "surreal"."audit_log"
  FOR EACH ROW EXECUTE FUNCTION "surreal"."reject_change"();
--> statement-breakpoint
CREATE TRIGGER "audit_log_no_truncate" BEFORE TRUNCATE ON "surreal"."audit_log"
  FOR EACH STATEMENT EXECUTE FUNCTION "surreal"."reject_change"();
--> statement-breakpoint
CREATE TRIGGER "device_transfer_notes_append_only" BEFORE UPDATE OR DELETE ON "surreal"."device_transfer_notes"
  FOR EACH ROW EXECUTE FUNCTION "surreal"."reject_change"();
--> statement-breakpoint
CREATE TRIGGER "device_transfer_notes_no_truncate" BEFORE TRUNCATE ON "surreal"."device_transfer_notes"
  FOR EACH STATEMENT EXECUTE FUNCTION "surreal"."reject_change"();
--> statement-breakpoint

-- ── The API's least-privilege role ────────────────────────────────
-- NOLOGIN: each environment adds its own login as a member (local: npm run db:local-user; production: Phase 4.5).
-- It can read and write rows, but never create, alter or drop anything.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'surreal_api') THEN
    CREATE ROLE surreal_api NOLOGIN;
  END IF;
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "surreal" TO surreal_api;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "surreal" TO surreal_api;
--> statement-breakpoint
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA "surreal" TO surreal_api;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "surreal" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO surreal_api;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "surreal" GRANT USAGE, SELECT ON SEQUENCES TO surreal_api;
--> statement-breakpoint
-- Logs are only ever added to.
REVOKE UPDATE, DELETE ON "surreal"."audit_log", "surreal"."device_transfer_notes", "surreal"."np_ipn_events", "surreal"."activation_attempts" FROM surreal_api;
--> statement-breakpoint
-- Records the business depends on are changed by status, never deleted.
REVOKE DELETE ON "surreal"."keys", "surreal"."devices", "surreal"."donations", "surreal"."sessions", "surreal"."device_transfers" FROM surreal_api;
--> statement-breakpoint

-- ── Keep Supabase's public roles out ──────────────────────────────
-- The schema isn't exposed by the data API anyway; this makes sure the anon key can't reach it by any route.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON SCHEMA "surreal" FROM anon, authenticated;
    REVOKE ALL ON ALL TABLES IN SCHEMA "surreal" FROM anon, authenticated;
  END IF;
END
$$;
--> statement-breakpoint

-- ── Default rules (from the spec; editable in admin) ──────────────
INSERT INTO "surreal"."key_rules" ("type", "name", "min_usd", "max_usd", "go_lives", "minutes_per_go_live", "expiry_days", "features") VALUES
  ('new_account', 'New account', NULL, NULL, 1, 60, 30, '{"face": true, "voice": true, "voiceCloning": false}'),
  ('tier', 'Starter', 5.00, 9.99, 2, 60, 30, '{"face": true, "voice": true, "voiceCloning": true}'),
  ('tier', 'Supporter', 10.00, 19.99, 5, 60, 60, '{"face": true, "voice": true, "voiceCloning": true}'),
  ('tier', 'Champion', 20.00, NULL, 12, 90, 90, '{"face": true, "voice": true, "voiceCloning": true}');
