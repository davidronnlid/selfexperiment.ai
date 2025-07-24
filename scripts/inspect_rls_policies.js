const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectAllRLSPolicies() {
  console.log('🔍 INSPECTING ALL RLS POLICIES\n');
  
  try {
    // 1. Get all RLS policies
    const { data: policies, error: policiesError } = await supabase.rpc('exec_sql', {
      sql: `
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
        WHERE schemaname = 'public'
        ORDER BY tablename, policyname;
      `
    });

    if (policiesError) throw policiesError;

    // 2. Get RLS status for all tables
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          tablename,
          rowsecurity as rls_enabled
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename;
      `
    });

    if (tablesError) throw tablesError;

    // 3. Get tables with value columns
    const { data: valueColumns, error: valueError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.table_name,
          c.column_name,
          c.data_type
        FROM information_schema.tables t
        JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
          AND c.table_schema = 'public'
          AND c.column_name ILIKE '%value%'
        ORDER BY t.table_name, c.column_name;
      `
    });

    if (valueError) throw valueError;

    // Display results
    console.log('📊 RLS STATUS OVERVIEW:');
    console.log('='.repeat(50));
    
    const rlsEnabledCount = tables.filter(t => t.rls_enabled).length;
    const totalTables = tables.length;
    const totalPolicies = policies.length;
    
    console.log(`📈 Total Tables: ${totalTables}`);
    console.log(`🔒 Tables with RLS Enabled: ${rlsEnabledCount}`);
    console.log(`📋 Total Active Policies: ${totalPolicies}\n`);

    // Group policies by table
    const policiesByTable = {};
    policies.forEach(policy => {
      if (!policiesByTable[policy.tablename]) {
        policiesByTable[policy.tablename] = [];
      }
      policiesByTable[policy.tablename].push(policy);
    });

    // Tables with value columns
    console.log('💰 TABLES WITH VALUE COLUMNS:');
    console.log('='.repeat(50));
    valueColumns.forEach(col => {
      const tableRLS = tables.find(t => t.tablename === col.table_name);
      const tablePolicies = policiesByTable[col.table_name] || [];
      
      console.log(`📅 ${col.table_name}.${col.column_name} (${col.data_type})`);
      console.log(`   RLS: ${tableRLS?.rls_enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`   Policies: ${tablePolicies.length} active`);
      
      if (tablePolicies.length > 0) {
        tablePolicies.forEach(p => {
          console.log(`     - ${p.policyname} (${p.cmd}): ${p.roles?.join(', ') || 'all roles'}`);
        });
      }
      console.log('');
    });

    // Data points specific
    console.log('🎯 DATA_POINTS TABLE ANALYSIS:');
    console.log('='.repeat(50));
    const dataPointsTable = tables.find(t => t.tablename === 'data_points');
    const dataPointsPolicies = policiesByTable['data_points'] || [];
    
    if (dataPointsTable) {
      console.log(`RLS Status: ${dataPointsTable.rls_enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`Active Policies: ${dataPointsPolicies.length}`);
      
      if (dataPointsPolicies.length > 0) {
        console.log('\nPOLICY DETAILS:');
        dataPointsPolicies.forEach(policy => {
          console.log(`\n📌 ${policy.policyname}`);
          console.log(`   Operation: ${policy.cmd}`);
          console.log(`   Roles: ${policy.roles?.join(', ') || 'all roles'}`);
          console.log(`   Type: ${policy.permissive}`);
          if (policy.qual) {
            console.log(`   USING: ${policy.qual}`);
          }
          if (policy.with_check) {
            console.log(`   WITH CHECK: ${policy.with_check}`);
          }
        });
      }
    } else {
      console.log('❌ data_points table not found!');
    }

    // Check for potential issues
    console.log('\n⚠️  POTENTIAL ISSUES:');
    console.log('='.repeat(50));
    
    const tablesWithRLSButNoPolicies = tables.filter(table => 
      table.rls_enabled && (!policiesByTable[table.tablename] || policiesByTable[table.tablename].length === 0)
    );

    if (tablesWithRLSButNoPolicies.length > 0) {
      console.log('🚨 Tables with RLS enabled but NO POLICIES (will be inaccessible):');
      tablesWithRLSButNoPolicies.forEach(table => {
        console.log(`   - ${table.tablename}`);
      });
      console.log('');
    }

    // Check for multiple policies on same operation
    const policyConflicts = {};
    policies.forEach(policy => {
      const key = `${policy.tablename}_${policy.cmd}`;
      if (!policyConflicts[key]) {
        policyConflicts[key] = [];
      }
      policyConflicts[key].push(policy);
    });

    const multiPolicyOperations = Object.entries(policyConflicts).filter(([key, policies]) => policies.length > 1);
    
    if (multiPolicyOperations.length > 0) {
      console.log('⚠️  Multiple policies on same table/operation:');
      multiPolicyOperations.forEach(([key, policies]) => {
        const [tablename, cmd] = key.split('_');
        console.log(`   - ${tablename} (${cmd}): ${policies.map(p => p.policyname).join(', ')}`);
      });
    }

    if (tablesWithRLSButNoPolicies.length === 0 && multiPolicyOperations.length === 0) {
      console.log('✅ No obvious issues detected!');
    }

  } catch (error) {
    console.error('❌ Error inspecting RLS policies:', error);
  }
}

// Run the inspection
inspectAllRLSPolicies(); 