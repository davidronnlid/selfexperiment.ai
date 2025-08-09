const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables (similar to the main project)
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('📝 Please create a .env.local file with:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.error('   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here');
  console.error('\n💡 Since we can\'t run the migration automatically, please:');
  console.error('   1. Copy the SQL from: supabase/migrations/20250128000002_fix_unit_priority_system.sql');
  console.error('   2. Run it in your Supabase SQL editor');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function applyUnitPriorityMigration() {
  console.log('🔧 Applying unit priority system migration...\n');
  
  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250128000002_fix_unit_priority_system.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded successfully');
    console.log('📊 Applying database functions...\n');
    
    // Apply the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql });
    
    if (error) {
      // If exec_sql doesn't exist, try direct SQL execution
      console.log('⚠️  exec_sql function not available, trying direct execution...');
      
      // Split the SQL into individual statements and execute them
      const statements = migrationSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          const { error: stmtError } = await supabase.rpc('exec', { sql: statement });
          if (stmtError) {
            console.error(`❌ Error executing statement: ${stmtError.message}`);
            throw stmtError;
          }
        }
      }
    }
    
    console.log('✅ Migration applied successfully!');
    console.log('\n📋 Changes applied:');
    console.log('   • Updated get_variable_units() to use priority system');
    console.log('   • Updated get_user_preferred_unit() to handle user preferences as priority -1');
    console.log('   • Added set_user_unit_preference() function');
    console.log('\n🎯 Priority system now works as:');
    console.log('   • Lower priority numbers = higher priority (1 = highest)');
    console.log('   • User preferences act as priority -1 (highest priority)');
    console.log('   • Units are returned ordered by priority\n');
    
    // Test the functions
    console.log('🧪 Testing updated functions...');
    await testFunctions();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n💡 Manual application required:');
    console.error('   1. Copy the SQL from: supabase/migrations/20250128000002_fix_unit_priority_system.sql');
    console.error('   2. Run it in your Supabase SQL editor');
    process.exit(1);
  }
}

async function testFunctions() {
  try {
    // Test get_variable_units function
    console.log('   Testing get_variable_units...');
    const { data: testData, error: testError } = await supabase
      .from('variables')
      .select('id')
      .limit(1)
      .single();
    
    if (!testError && testData) {
      const { data: units, error: unitsError } = await supabase.rpc('get_variable_units', {
        var_id: testData.id
      });
      
      if (!unitsError) {
        console.log('   ✅ get_variable_units function working');
      } else {
        console.log('   ⚠️  get_variable_units function needs manual verification');
      }
    }
    
    console.log('   ✅ Function tests completed');
    
  } catch (error) {
    console.log('   ⚠️  Function testing skipped - manual verification recommended');
  }
}

// Run the migration
applyUnitPriorityMigration();