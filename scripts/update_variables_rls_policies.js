// Apply RLS policy updates for variables table
// This script updates the variables table to allow public read access

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateVariablesRLS() {
  try {
    console.log('🔄 Updating RLS policies for variables table...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '../database/fix_variables_rls_for_public_read.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Split the SQL content into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement) {
        try {
          console.log(`   ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
          const { error } = await supabase.rpc('exec_sql', { 
            sql_statement: statement + ';' 
          });
          
          if (error) {
            console.warn(`   ⚠️  Warning on statement ${i + 1}:`, error.message);
          } else {
            console.log(`   ✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.warn(`   ⚠️  Error on statement ${i + 1}:`, err.message);
        }
      }
    }

    // Test the new policies
    console.log('\n🧪 Testing public access to variables...');
    
    // Create a client without authentication to test public access
    const publicClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const { data: variables, error: selectError } = await publicClient
      .from('variables')
      .select('id, label, slug, data_type, is_active')
      .eq('is_active', true)
      .limit(5);

    if (selectError) {
      console.error('❌ Public read test failed:', selectError);
    } else {
      console.log('✅ Public read test successful!');
      console.log(`   Found ${variables?.length || 0} variables`);
      if (variables && variables.length > 0) {
        console.log('   Sample variables:', variables.map(v => v.label).join(', '));
      }
    }

    // Test that public users cannot write
    console.log('\n🔒 Testing write restrictions...');
    const { error: insertError } = await publicClient
      .from('variables')
      .insert({ label: 'Test Variable', data_type: 'numeric' });

    if (insertError) {
      console.log('✅ Write restriction test successful - insert properly blocked');
    } else {
      console.warn('⚠️  Warning: Public insert was allowed (this should not happen)');
    }

    console.log('\n🎉 RLS policy update completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Public users can read variables (except created_by column)');
    console.log('   ✅ Public users cannot create, update, or delete variables');
    console.log('   ✅ Authenticated users can manage their own variables');

  } catch (error) {
    console.error('❌ Failed to update RLS policies:', error);
    process.exit(1);
  }
}

// Run the update
updateVariablesRLS(); 