-- ============================================================================
-- SECURITY AUDIT QUERIES FOR RLS
-- ============================================================================
-- These queries help identify potential security issues

-- 1. Tables with RLS enabled but NO policies (SECURITY RISK!)
WITH rls_tables AS (
    SELECT 
        t.table_name,
        c.relrowsecurity as has_rls
    FROM information_schema.tables t
    JOIN pg_class c ON c.relname = t.table_name
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND n.nspname = 'public'
        AND c.relrowsecurity = true
),
policy_tables AS (
    SELECT DISTINCT tablename as table_name
    FROM pg_policies 
    WHERE schemaname = 'public'
)
SELECT 
    '🚨 SECURITY ALERT' as alert_type,
    rt.table_name,
    'Table has RLS enabled but NO policies - Data is INACCESSIBLE!' as issue
FROM rls_tables rt
LEFT JOIN policy_tables pt ON rt.table_name = pt.table_name
WHERE pt.table_name IS NULL;

-- 2. Tables with important data but NO RLS (POTENTIAL SECURITY RISK)
SELECT 
    '⚠️ SECURITY WARNING' as alert_type,
    t.table_name,
    'Table may contain sensitive data but RLS is DISABLED' as issue
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE t.table_schema = 'public' 
    AND t.table_type = 'BASE TABLE'
    AND n.nspname = 'public'
    AND c.relrowsecurity = false
    AND t.table_name IN (
        'data_points', 
        'logs', 
        'daily_logs',
        'user_data',
        'profiles',
        'tokens',
        'credentials'
    );

-- 3. Policies that allow unrestricted access (CHECK THESE CAREFULLY)
SELECT 
    'ℹ️ REVIEW NEEDED' as alert_type,
    tablename,
    policyname,
    cmd as operation,
    'Policy allows broad access - verify this is intentional' as note,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public'
    AND (
        qual = 'true' 
        OR qual LIKE '%true%'
        OR qual IS NULL
    )
    AND cmd != 'SELECT'  -- SELECT policies with 'true' might be intentional for public tables
ORDER BY tablename, policyname;

-- 4. Check for policies using deprecated auth patterns (PERFORMANCE ISSUE)
SELECT 
    '⚡ PERFORMANCE WARNING' as alert_type,
    tablename,
    policyname,
    cmd,
    'Auth function not optimized - wrap with (select ...)' as issue,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN 'qual uses auth.uid()'
        WHEN qual LIKE '%auth.role()%' THEN 'qual uses auth.role()'
        WHEN with_check LIKE '%auth.uid()%' THEN 'with_check uses auth.uid()'
        WHEN with_check LIKE '%auth.role()%' THEN 'with_check uses auth.role()'
    END as details
FROM pg_policies 
WHERE schemaname = 'public'
    AND (
        qual LIKE '%auth.uid()%' 
        OR qual LIKE '%auth.role()%'
        OR with_check LIKE '%auth.uid()%'
        OR with_check LIKE '%auth.role()%'
    )
    AND NOT (
        qual LIKE '%(select auth.%'
        OR with_check LIKE '%(select auth.%'
    );

-- 5. Find policies that might conflict (Multiple permissive policies)
SELECT 
    '🔄 POLICY CONFLICT CHECK' as alert_type,
    tablename,
    cmd as operation,
    COUNT(*) as policy_count,
    'Multiple permissive policies may cause confusion' as note,
    array_agg(policyname) as policy_names
FROM pg_policies 
WHERE schemaname = 'public'
    AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY policy_count DESC;

-- 6. Summary of potential issues
SELECT 
    '📊 SECURITY AUDIT SUMMARY' as summary_type,
    (
        SELECT COUNT(*) 
        FROM information_schema.tables t
        JOIN pg_class c ON c.relname = t.table_name
        WHERE t.table_schema = 'public' 
            AND c.relrowsecurity = false
    ) as tables_without_rls,
    (
        SELECT COUNT(DISTINCT tablename) 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) as tables_with_policies,
    (
        SELECT COUNT(*) 
        FROM pg_policies 
        WHERE schemaname = 'public'
            AND (qual LIKE '%auth.uid()%' OR qual LIKE '%auth.role()%')
            AND NOT (qual LIKE '%(select auth.%')
    ) as unoptimized_auth_policies; 