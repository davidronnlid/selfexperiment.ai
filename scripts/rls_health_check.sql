-- ============================================================================
-- RLS HEALTH CHECK - Quick Overview
-- ============================================================================
-- Run this for a fast summary of your RLS policy health

-- 1. SUMMARY STATISTICS
SELECT 
    'TOTAL TABLES' as metric,
    COUNT(*) as count
FROM pg_tables WHERE schemaname = 'public'
UNION ALL
SELECT 
    'TABLES WITH RLS ENABLED',
    COUNT(*) 
FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true
UNION ALL
SELECT 
    'TOTAL POLICIES',
    COUNT(*) 
FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 
    'TABLES WITH RLS BUT NO POLICIES',
    COUNT(*)
FROM (
    SELECT t.tablename
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public' AND t.rowsecurity = true
    GROUP BY t.tablename
    HAVING COUNT(p.policyname) = 0
) subq;

-- 2. POTENTIAL ISSUES
SELECT 
    '🚨 POTENTIAL ISSUES' as section,
    tablename,
    'RLS enabled but no policies - table will be inaccessible!' as issue
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public' AND t.rowsecurity = true
GROUP BY t.tablename
HAVING COUNT(p.policyname) = 0

UNION ALL

SELECT 
    '⚠️ MULTIPLE POLICIES',
    tablename || ' (' || cmd || ')',
    'Multiple permissive policies - check if intentional'
FROM pg_policies 
WHERE schemaname = 'public' AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;

-- 3. DATA_POINTS SPECIFIC STATUS
SELECT 
    '📊 DATA_POINTS STATUS' as section,
    CASE 
        WHEN t.rowsecurity THEN 'RLS ENABLED ✅' 
        ELSE 'RLS DISABLED ❌' 
    END as status,
    COALESCE(COUNT(p.policyname)::text, '0') || ' policies' as policy_count
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename
WHERE t.tablename = 'data_points' AND t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity; 