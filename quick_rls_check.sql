-- ============================================================================
-- QUICK RLS STATUS CHECK
-- ============================================================================
-- Run this first to get a quick overview

-- 1. Tables with RLS enabled/disabled
SELECT 
    t.table_name,
    CASE WHEN c.relrowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_status
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND n.nspname = 'public'
ORDER BY rls_status DESC, t.table_name;

-- 2. Quick summary
WITH stats AS (
    SELECT 
        COUNT(*) as total_tables,
        COUNT(CASE WHEN c.relrowsecurity THEN 1 END) as rls_enabled,
        COUNT(CASE WHEN NOT c.relrowsecurity THEN 1 END) as rls_disabled
    FROM information_schema.tables t
    JOIN pg_class c ON c.relname = t.table_name
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND n.nspname = 'public'
)
SELECT 
    total_tables,
    rls_enabled,
    rls_disabled,
    ROUND((rls_enabled::decimal / total_tables * 100), 1) || '%' as rls_coverage
FROM stats; 