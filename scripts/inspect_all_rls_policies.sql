-- ============================================================================
-- COMPREHENSIVE RLS POLICY INSPECTION SCRIPT
-- ============================================================================
-- This script provides a complete overview of all RLS policies in your database
-- Run this in your Supabase SQL Editor to get the current state

-- ============================================================================
-- 1. ALL ACTIVE RLS POLICIES (Most Important Query)
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive, -- 'PERMISSIVE' or 'RESTRICTIVE'
    roles, -- Which roles the policy applies to
    cmd, -- 'ALL', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
    qual, -- The USING clause condition
    with_check -- The WITH CHECK clause condition
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================================================
-- 2. RLS STATUS FOR ALL TABLES
-- ============================================================================

SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ============================================================================
-- 3. TABLES WITH RLS BUT NO POLICIES (Potentially Problematic)
-- ============================================================================

SELECT 
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' AND t.rowsecurity = true
GROUP BY t.tablename, t.rowsecurity
HAVING COUNT(p.policyname) = 0
ORDER BY t.tablename;

-- ============================================================================
-- 4. DETAILED POLICY ANALYSIS FOR DATA_POINTS TABLE
-- ============================================================================

SELECT 
    'DATA_POINTS POLICIES' as section,
    policyname,
    permissive,
    roles,
    cmd as operation,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'data_points' AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- 5. POLICIES BY OPERATION TYPE
-- ============================================================================

SELECT 
    cmd as operation,
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT tablename, ', ') as tables
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY cmd
ORDER BY cmd;

-- ============================================================================
-- 6. POTENTIAL CONFLICTS - Multiple Permissive Policies on Same Table/Operation
-- ============================================================================

SELECT 
    tablename,
    cmd,
    COUNT(*) as permissive_policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies 
WHERE schemaname = 'public' 
    AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY tablename, cmd;

-- ============================================================================
-- 7. TABLES WITH VALUE COLUMNS AND THEIR RLS STATUS
-- ============================================================================

SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    CASE 
        WHEN pt.rowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status,
    COUNT(p.policyname) as policy_count
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN pg_tables pt ON t.table_name = pt.tablename
LEFT JOIN pg_policies p ON t.table_name = p.tablename
WHERE t.table_schema = 'public' 
    AND c.table_schema = 'public'
    AND c.column_name ILIKE '%value%'
GROUP BY t.table_name, c.column_name, c.data_type, pt.rowsecurity
ORDER BY t.table_name, c.column_name;

-- ============================================================================
-- 8. POLICY CREATION TIMELINE (If you have audit logs)
-- ============================================================================

-- Note: This query might not work if you don't have audit logging enabled
-- SELECT 
--     schemaname,
--     tablename, 
--     policyname,
--     'Policy exists' as status
-- FROM pg_policies 
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- ============================================================================
-- 9. ROLE-BASED POLICY BREAKDOWN
-- ============================================================================

SELECT 
    UNNEST(roles) as role_name,
    COUNT(*) as policy_count,
    STRING_AGG(DISTINCT tablename, ', ') as affected_tables
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY UNNEST(roles)
ORDER BY role_name;

-- ============================================================================
-- 10. COMPREHENSIVE SUMMARY FOR DATA_POINTS AND VALUE COLUMNS
-- ============================================================================

WITH value_tables AS (
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    WHERE t.table_schema = 'public' 
        AND c.table_schema = 'public'
        AND (c.column_name ILIKE '%value%' OR t.table_name = 'data_points')
)
SELECT 
    vt.table_name,
    CASE 
        WHEN pt.rowsecurity THEN 'RLS ENABLED' 
        ELSE 'RLS DISABLED' 
    END as rls_status,
    COUNT(p.policyname) as total_policies,
    STRING_AGG(
        CASE WHEN p.cmd = 'ALL' THEN 'ALL_OPERATIONS'
             ELSE p.cmd 
        END, ', '
    ) as operations_covered,
    STRING_AGG(p.policyname, ', ') as policy_names
FROM value_tables vt
LEFT JOIN pg_tables pt ON vt.table_name = pt.tablename AND pt.schemaname = 'public'
LEFT JOIN pg_policies p ON vt.table_name = p.tablename AND p.schemaname = 'public'
GROUP BY vt.table_name, pt.rowsecurity
ORDER BY vt.table_name;

-- ============================================================================
-- USAGE INSTRUCTIONS:
-- ============================================================================
-- 1. Run this entire script in your Supabase SQL Editor
-- 2. Each section provides different insights:
--    - Section 1: Complete list of all active policies
--    - Section 2: RLS enablement status
--    - Section 3: Tables that might have issues (RLS enabled but no policies)
--    - Section 4: Specific focus on data_points table
--    - Section 6: Potential conflicts to investigate
--    - Section 10: Summary for all tables with value columns
-- 
-- 3. Pay special attention to:
--    - Tables with RLS enabled but 0 policies (Section 3)
--    - Multiple permissive policies on same operation (Section 6) 
--    - Tables with value columns and their protection status (Section 10) 