# Units Table RLS Policies Explanation

## Problem

The original RLS policy tried to reference a `user_id` column that doesn't exist in the `units` table:

```sql
-- ❌ This fails because units table has no user_id column
CREATE POLICY "Allow insert for owner"
ON units
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

## Why Units Table is Different

The `units` table is a **global reference table** that contains standard measurement units like:

- Mass: kg, lb, g, oz, mg
- Distance: m, km, mi, ft, cm, in
- Time: hours, minutes, seconds, days
- Temperature: °C, °F, K

### Key Characteristics:

1. **Shared Resource**: All users need access to the same units
2. **No User Ownership**: Units like "kilogram" don't belong to specific users
3. **System Managed**: Units should be maintained by administrators, not end users
4. **Read-Heavy**: Users primarily read units, rarely modify them

## Correct RLS Approach

### For Reading (SELECT)

```sql
-- ✅ Allow all authenticated users to read units
CREATE POLICY "Allow read access to all authenticated users"
ON units
FOR SELECT
TO authenticated
USING (true);
```

### For Writing (INSERT/UPDATE/DELETE)

**Option 1: Service Role Only (Recommended)**

```sql
-- ✅ Only system administrators can modify units
CREATE POLICY "Allow insert for service role only"
ON units
FOR INSERT
TO service_role
WITH CHECK (true);
```

**Option 2: Allow User Contributions**

```sql
-- ✅ Allow users to suggest new units (if desired)
CREATE POLICY "Allow insert for authenticated users"
ON units
FOR INSERT
TO authenticated
WITH CHECK (true);
```

## Table Structure Reference

```sql
CREATE TABLE units (
    id TEXT PRIMARY KEY,           -- No user_id column
    label TEXT NOT NULL,
    symbol TEXT NOT NULL,
    unit_group TEXT NOT NULL,
    conversion_to TEXT,
    conversion_factor NUMERIC,
    is_base BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Solution Applied

The fix in `database/fix_units_rls_policies.sql`:

1. **Drops incorrect policies** that reference non-existent `user_id`
2. **Enables RLS** on the units table
3. **Allows read access** to all authenticated users
4. **Restricts write access** to service role only
5. **Provides alternative** policies for user contributions if needed
6. **Includes verification** queries to test the setup

This approach ensures that:

- ✅ All users can read available units
- ✅ Units remain consistent across the system
- ✅ Only authorized roles can modify the reference data
- ✅ No errors occur due to missing columns
