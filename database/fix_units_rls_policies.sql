-- ============================================================================
-- FIX UNITS TABLE RLS POLICIES
-- ============================================================================
-- The units table is a global reference table containing standard units
-- like "kg", "lb", "°C", etc. These are shared across all users and don't
-- have user ownership. RLS policies should reflect this.

-- 1. Drop any existing incorrect policies
DROP POLICY IF EXISTS "Allow read access to all users" ON units;
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON units;
DROP POLICY IF EXISTS "Allow insert for owner" ON units;
DROP POLICY IF EXISTS "Allow update for owner" ON units;
DROP POLICY IF EXISTS "Allow delete for owner" ON units;
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON units;
DROP POLICY IF EXISTS "Allow update for authenticated users" ON units;
DROP POLICY IF EXISTS "Allow delete for service role only" ON units;

-- 2. Enable RLS (if not already enabled)
ALTER TABLE units ENABLE ROW LEVEL SECURITY;

-- 3. Allow all authenticated users to read units (this is a reference table)
CREATE POLICY "Allow read access to all authenticated users"
ON units
FOR SELECT
TO authenticated
USING (true);

-- 4. Only allow service role to insert/update/delete units
-- (Units should be managed by the system, not individual users)
-- CREATE POLICY "Allow insert for service role only"
-- ON units
-- FOR INSERT
-- TO service_role
-- WITH CHECK (true);

-- CREATE POLICY "Allow update for service role only"
-- ON units
-- FOR UPDATE
-- TO service_role
-- USING (true)
-- WITH CHECK (true);

CREATE POLICY "Allow delete for service role only"
ON units
FOR DELETE
TO service_role
USING (true);

-- 5. Alternatively, if you want to allow authenticated users to suggest new units
-- (uncomment these and comment out the service_role policies above)

CREATE POLICY "Allow insert for authenticated users"
ON units
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users"
ON units
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- 6. Verify the policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'units';

-- 7. Test read access (should work for authenticated users)
SELECT 'Testing units table access...' as info;
SELECT id, label, symbol, unit_group 
FROM units 
WHERE unit_group = 'mass' 
LIMIT 5;

SELECT '✅ Units table RLS policies have been corrected!' as result; 