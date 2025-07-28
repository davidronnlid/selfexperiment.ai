# How to Run RLS Verification Queries

## Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Copy and paste any of the SQL scripts into the editor
4. Click **Run** to execute

## Option 2: Supabase CLI

If you have Supabase CLI set up locally:

```bash
# Connect to your remote database
npx supabase db remote

# Option A: Run via psql (if you have direct connection)
psql -h your-db-url -U postgres -d postgres -f quick_rls_check.sql

# Option B: Copy content and paste into CLI
cat quick_rls_check.sql | pbcopy  # macOS
cat quick_rls_check.sql | xclip   # Linux
```

## Script Files Created

### 1. `quick_rls_check.sql`
**Start here** - Quick overview of RLS status across all tables

### 2. `rls_verification_queries.sql` 
**Complete audit** - Comprehensive verification of all RLS policies

### 3. `check_specific_table_policies.sql`
**Table-specific checks** - Focus on individual tables

### 4. `security_audit_queries.sql`
**Security analysis** - Identify potential security issues

## Recommended Order

1. **Start with:** `quick_rls_check.sql` - Get the overview
2. **Then run:** `security_audit_queries.sql` - Check for issues
3. **Deep dive with:** `rls_verification_queries.sql` - Full analysis
4. **Focus on specific tables:** `check_specific_table_policies.sql`

## Key Things to Look For

### ✅ Good Signs
- Tables with sensitive data have RLS enabled
- Policies use `(select auth.uid())` instead of `auth.uid()`
- Each table has appropriate policies for its access pattern
- No tables with RLS enabled but zero policies

### ⚠️ Warning Signs
- Tables with `auth.uid()` instead of `(select auth.uid())`
- Multiple permissive policies for the same operation
- Sensitive tables without RLS
- Policies with `qual = 'true'` on non-public tables

### 🚨 Critical Issues
- Tables with RLS enabled but no policies (data becomes inaccessible)
- Sensitive user data tables without RLS
- Policies that expose other users' private data

## Example: Checking Your Core Tables

```sql
-- Quick check of your most important tables
SELECT 
    tablename,
    COUNT(*) as policy_count,
    array_agg(cmd) as operations_covered
FROM pg_policies 
WHERE tablename IN (
    'data_points', 
    'variables', 
    'user_variable_preferences',
    'apple_health_variable_data_points'
)
AND schemaname = 'public'
GROUP BY tablename;
``` 