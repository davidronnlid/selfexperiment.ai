# RLS Security Fix

## Overview

This document explains how to fix the Row Level Security (RLS) issues detected by the Supabase database linter:

1. **`public.cron_job_logs`** - RLS disabled on system logging table
2. **`public.variable_units`** - RLS disabled on units relationship table

## Quick Fix

Run this script in your Supabase SQL Editor:

```sql
-- File: database/fix_rls_security_issues.sql
```

Or run the individual scripts:

1. `database/fix_rls_cron_job_logs.sql`
2. `database/fix_rls_variable_units.sql`

## Security Models Applied

### 1. cron_job_logs Table

**Security Model**: System-only access

- **Access**: Service role only
- **Rationale**: System logging table containing cron job execution data
- **Policies**:
  - Service role can perform all operations (SELECT, INSERT, UPDATE, DELETE)
  - No user access (prevents unauthorized system log access)

### 2. variable_units Table

**Security Model**: Read-public, Write-restricted

- **Read Access**: All authenticated users
- **Write Access**: Service role only
- **Rationale**:
  - Users need to read variable-unit relationships for UI components
  - System management prevents unauthorized data modifications
- **Policies**:
  - Authenticated users can SELECT
  - Service role can INSERT, UPDATE, DELETE

## Alternative Configuration

If your application requires authenticated users to manage `variable_units` (e.g., admin functionality), use the alternative configuration in the script:

```sql
-- Allow authenticated users to manage variable_units
CREATE POLICY "Authenticated users can manage variable units" ON variable_units
    FOR ALL USING (auth.role() = 'authenticated');
```

## Verification

After running the script, verify the changes:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('cron_job_logs', 'variable_units')
AND schemaname = 'public';

-- List policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE tablename IN ('cron_job_logs', 'variable_units')
AND schemaname = 'public';
```

## Security Best Practices Followed

1. **Principle of Least Privilege**: Users only get necessary access
2. **System Table Protection**: System tables restricted to service role
3. **Data Integrity**: Write operations controlled to prevent unauthorized changes
4. **Transparency**: Clear documentation of access patterns
5. **Flexibility**: Alternative configurations provided for different needs

## Files Created

- `database/fix_rls_security_issues.sql` - Combined fix for both issues
- `database/fix_rls_cron_job_logs.sql` - Individual fix for cron_job_logs
- `database/fix_rls_variable_units.sql` - Individual fix for variable_units
- `docs/RLS_SECURITY_FIX.md` - This documentation

## Testing

After applying the fix:

1. ✅ Database linter should show no RLS errors
2. ✅ Users can read `variable_units` for UI components
3. ✅ Users cannot modify system tables without authorization
4. ✅ Service role can manage both tables as needed
5. ✅ Application functionality remains intact
