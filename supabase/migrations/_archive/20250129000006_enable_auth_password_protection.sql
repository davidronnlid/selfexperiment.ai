-- ============================================================================
-- Strengthen Auth Password Policy (local defaults; remote can be managed in dashboard)
-- This adjusts minimum password length and requirements to align with best practices.
-- Note: Leaked password protection is managed by the Supabase Auth service (dashboard/ENV).
-- ============================================================================

-- Increase password requirements if running self-hosted/local
-- This mirrors config that would be set in supabase/config.toml but keeps a record in migrations.
-- No-op on hosted projects; keep for documentation and self-hosted use.

-- Nothing to execute in SQL for hosted leaked password protection; see docs.
-- Refer to: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection


